import { CHART_KINDS } from '../../../../../application/charts/constants/chartKinds';
import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';
import type { ChartKind } from '../../../../../application/charts/model/config/ChartKind';
import { getChartKind } from '../../../../../application/charts/support/kinds/getChartKind';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { NO_COLUMN } from '../../constants/noColumn';
import type { ChartConfigUpdate } from '../model/ChartConfigUpdate';
import type { ChartControlsCallbacks } from '../model/ChartControlsCallbacks';
import type { ChartControlsState } from '../model/ChartControlsState';
import { createBinInput } from './createBinInput';
import { createField } from './createField';
import { createMeasures } from './createMeasures';
import { createSelect } from './createSelect';
import { createToggle } from './createToggle';
import { toOption } from './toOption';

interface FieldScope {
  readonly config: ChartConfig;
  readonly definition: ReturnType<typeof getChartKind>;
  readonly numbers: readonly string[];
  readonly allNames: readonly string[];
  readonly update: ChartConfigUpdate;
}

function createKindField(state: ChartControlsState, callbacks: ChartControlsCallbacks): HTMLElement {
  const kinds = CHART_KINDS.filter((kind) => kind.id !== 'stat' || state.canUseStat);
  return createField(l10n.t('Chart'), createSelect(kinds.map((kind) => ({ value: kind.id, label: kind.label() })), state.config.kind, (value) => callbacks.onKindChange(value as ChartKind)));
}

function createAxisFields({ config, definition, numbers, allNames, update }: FieldScope): HTMLElement[] {
  const fields: HTMLElement[] = [];
  if (definition.x !== 'none') {
    const options = (definition.x === 'number' ? numbers : allNames).map(toOption);
    fields.push(createField('X', createSelect(options, config.x ?? NO_COLUMN, (value) => update({ x: value }))));
  }
  if (definition.y === 'one') {
    fields.push(createField(config.kind === 'heatmap' || config.kind === 'pie' ? l10n.t('Value') : 'Y', createSelect(numbers.map(toOption), config.y[0] ?? NO_COLUMN, (value) => update({ y: [value] }))));
  }
  if (definition.y === 'many') {
    fields.push(createMeasures(numbers.filter((name) => name !== config.x), config, update));
  }
  return fields;
}

function createGroupFields({ config, definition, allNames, update }: FieldScope): HTMLElement[] {
  if (definition.group === 'none') {
    return [];
  }
  const groupOptions = allNames.filter((name) => name !== config.x).map(toOption);
  const options = definition.group === 'optional' ? [{ value: NO_COLUMN, label: l10n.t('None') }, ...groupOptions] : groupOptions;
  const onChange = (value: string): void => {
    const group = value === NO_COLUMN ? undefined : value;
    update(group ? { group, y: config.y.slice(0, 1) } : { group });
  };
  return [createField(definition.groupLabel(), createSelect(options, config.group ?? NO_COLUMN, onChange))];
}

function createExtraFields({ config, update }: FieldScope): HTMLElement[] {
  const fields: HTMLElement[] = [];
  if (config.kind === 'scatter') {
    fields.push(createToggle(l10n.t('Trend line'), config.showRegression, (isOn) => update({ showRegression: isOn })));
  }
  if (config.kind === 'histogram') {
    fields.push(createField(l10n.t('Bins'), createBinInput(config, update)));
  }
  return fields;
}

export function createFields(state: ChartControlsState, callbacks: ChartControlsCallbacks, update: ChartConfigUpdate): HTMLElement[] {
  const { config, columns } = state;
  const scope: FieldScope = {
    config,
    definition: getChartKind(config.kind),
    numbers: columns.filter((column) => column.kind === 'number').map((column) => column.name),
    allNames: columns.map((column) => column.name),
    update,
  };
  return [createKindField(state, callbacks), ...createAxisFields(scope), ...createGroupFields(scope), ...createExtraFields(scope)];
}
