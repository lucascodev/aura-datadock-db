import { CHART_KINDS, getChartKind } from '../../../../application/charts/model/chartKinds';
import type { ChartConfig } from '../../../../application/charts/model/ChartConfig';
import type { ChartKind } from '../../../../application/charts/model/ChartKind';
import type { ColumnInfo } from '../../../../application/charts/model/ColumnKind';
import { createElement } from '../../shared/createElement';
import { l10n } from '../../../../domain/i18n/l10n';

const NO_COLUMN = '';
const MIN_BINS = 1;

export interface ChartControlsCallbacks {
  onKindChange(kind: ChartKind): void;
  onConfigChange(config: ChartConfig): void;
  onExport(format: 'png' | 'svg'): void;
}

export interface ChartControlsState {
  readonly config: ChartConfig;
  readonly columns: readonly ColumnInfo[];
  readonly canUseStat: boolean;
  readonly canExport: boolean;
}

export function renderChartControls(state: ChartControlsState, callbacks: ChartControlsCallbacks): HTMLElement {
  const { config, columns } = state;
  const definition = getChartKind(config.kind);
  const numbers = columns.filter((column) => column.kind === 'number').map((column) => column.name);
  const allNames = columns.map((column) => column.name);
  const update = (change: Partial<ChartConfig>) => callbacks.onConfigChange({ ...config, ...change });

  const kinds = CHART_KINDS.filter((kind) => kind.id !== 'stat' || state.canUseStat);
  const fields: HTMLElement[] = [
    field(l10n.t('Chart'), select(kinds.map((kind) => ({ value: kind.id, label: kind.label() })), config.kind, (value) => callbacks.onKindChange(value as ChartKind))),
  ];

  if (definition.x !== 'none') {
    const options = (definition.x === 'number' ? numbers : allNames).map(toOption);
    fields.push(field('X', select(options, config.x ?? NO_COLUMN, (value) => update({ x: value }))));
  }
  if (definition.y === 'one') {
    fields.push(field(config.kind === 'heatmap' || config.kind === 'pie' ? l10n.t('Value') : 'Y', select(numbers.map(toOption), config.y[0] ?? NO_COLUMN, (value) => update({ y: [value] }))));
  }
  if (definition.y === 'many') {
    fields.push(renderMeasures(numbers.filter((name) => name !== config.x), config, update));
  }
  if (definition.group !== 'none') {
    const groupOptions = allNames.filter((name) => name !== config.x).map(toOption);
    const options = definition.group === 'optional' ? [{ value: NO_COLUMN, label: l10n.t('None') }, ...groupOptions] : groupOptions;
    fields.push(field(definition.groupLabel(), select(options, config.group ?? NO_COLUMN, (value) => updateGroup(value, config, update))));
  }
  if (config.kind === 'scatter') {
    fields.push(renderToggle(l10n.t('Trend line'), config.showRegression, (isOn) => update({ showRegression: isOn })));
  }
  if (config.kind === 'histogram') {
    fields.push(field(l10n.t('Bins'), renderBinInput(config, update)));
  }

  const exportButtons = (['png', 'svg'] as const).map((format) => {
    const button = createElement('button', { className: 'secondary', text: format.toUpperCase(), title: l10n.t('Save this chart as {0}', format.toUpperCase()), onClick: () => callbacks.onExport(format) });
    button.disabled = !state.canExport;
    return button;
  });

  return createElement('div', { className: 'chart-controls' }, [...fields, createElement('span', { className: 'spacer-flex' }), ...exportButtons]);
}

function updateGroup(value: string, config: ChartConfig, update: (change: Partial<ChartConfig>) => void): void {
  const group = value === NO_COLUMN ? undefined : value;
  update(group ? { group, y: config.y.slice(0, 1) } : { group });
}

function toOption(name: string): { value: string; label: string } {
  return { value: name, label: name };
}

function field(label: string, control: HTMLElement): HTMLElement {
  const element = createElement('label', { className: 'chart-field' }, [createElement('span', { className: 'chart-field-label', text: label }), control]);
  return element;
}

function select(options: readonly { value: string; label: string }[], current: string, onChange: (value: string) => void): HTMLSelectElement {
  const element = createElement('select');
  element.append(
    ...options.map((option) => {
      const item = createElement('option', { text: option.label });
      item.value = option.value;
      return item;
    }),
  );
  element.value = current;
  element.addEventListener('change', () => onChange(element.value));
  return element;
}

function renderToggle(label: string, isOn: boolean, onChange: (isOn: boolean) => void): HTMLElement {
  const input = createElement('input');
  input.type = 'checkbox';
  input.checked = isOn;
  input.addEventListener('change', () => onChange(input.checked));
  return createElement('label', { className: 'chart-toggle' }, [input, createElement('span', { text: label })]);
}

function renderMeasures(numbers: readonly string[], config: ChartConfig, update: (change: Partial<ChartConfig>) => void): HTMLElement {
  if (config.group) {
    return field('Y', select(numbers.map(toOption), config.y[0] ?? NO_COLUMN, (value) => update({ y: [value] })));
  }
  const toggles = numbers.map((name) =>
    renderToggle(name, config.y.includes(name), (isOn) => {
      const chosen = isOn ? [...config.y, name] : config.y.filter((other) => other !== name);
      update({ y: numbers.filter((other) => chosen.includes(other)) });
    }),
  );
  return createElement('div', { className: 'chart-field' }, [createElement('span', { className: 'chart-field-label', text: 'Y' }), ...toggles]);
}

function renderBinInput(config: ChartConfig, update: (change: Partial<ChartConfig>) => void): HTMLElement {
  const input = createElement('input', { className: 'chart-bins', title: l10n.t('Leave empty to choose automatically') });
  input.type = 'number';
  input.min = String(MIN_BINS);
  input.placeholder = l10n.t('Auto');
  input.value = config.binCount ? String(config.binCount) : '';
  input.addEventListener('change', () => {
    const value = Number(input.value);
    update({ binCount: input.value && value >= MIN_BINS ? value : undefined });
  });
  return input;
}
