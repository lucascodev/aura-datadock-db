import type { ChartConfig } from '../../../application/charts/model/config/ChartConfig';
import { summarizeSql } from '../../../application/query/analysis/statements/summarizeSql';
import type { ExportFormatView, ResultSetView, ResultsHostMessage, ResultsViewState, ResultsWebviewMessage } from '../../contracts/ResultsMessages';
import { l10n, useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { createElement } from '../shared/dom/createElement';
import { connectToHost } from '../shared/host/connectToHost';
import { ChartView } from './chart/ChartView';
import { ResultGrid } from './grid/ResultGrid';

useL10nCatalog(readL10nCatalog());

const TAB_LABEL_CHARACTERS = 28;
const CELL_SEPARATOR = '\t';
const NULL_TEXT = '';
const COLUMN_KEY_SEPARATOR = '\u0000';

type ResultView = 'grid' | 'chart';

const host = connectToHost<ResultsWebviewMessage>();
const app = document.getElementById('app') as HTMLElement;

let state: ResultsViewState | undefined;
let activeResultIndex = 0;
let exportFormatId: ExportFormatView['id'] | undefined;
let activeView: ResultView = 'grid';
let savedChart: { readonly columnsKey: string; readonly config: ChartConfig } | undefined;
let activeChart: ChartView | undefined;

window.addEventListener('message', (event: MessageEvent<ResultsHostMessage>) => {
  if (event.data.type === 'state') {
    state = event.data.state;
    activeResultIndex = state.phase === 'done' ? defaultResultIndex(state.results) : 0;
    render();
  }
});

host.postMessage({ type: 'ready' });

function defaultResultIndex(results: readonly ResultSetView[]): number {
  const failed = results.findIndex((result) => result.status === 'error');
  return failed !== -1 ? failed : Math.max(0, results.length - 1);
}

function render(): void {
  activeChart?.dispose();
  activeChart = undefined;
  if (!state) {
    return;
  }
  if (state.phase === 'running') {
    app.replaceChildren(renderRunning(state.connectionName, state.sql));
    return;
  }
  renderDone(state);
}

function renderRunning(connectionName: string, sql: string): HTMLElement {
  return createElement('div', { className: 'running' }, [
    createElement('div', { className: 'running-title', text: l10n.t('Running on {0}…', connectionName) }),
    createElement('pre', { className: 'sql', text: sql }),
    createElement('button', { text: l10n.t('Cancel'), onClick: () => host.postMessage({ type: 'cancel' }) }),
  ]);
}

function renderDone(done: Extract<ResultsViewState, { phase: 'done' }>): void {
  if (done.results.length === 0) {
    app.replaceChildren(createElement('div', { className: 'empty', text: l10n.t('The query was canceled before it started.') }));
    return;
  }
  const tabs = done.results.length > 1 ? [renderTabs(done.results)] : [];
  const result = done.results[activeResultIndex];
  app.replaceChildren(...tabs, createElement('pre', { className: 'sql', text: result.sql }), ...renderResult(result, done.exportFormats));
}

function renderTabs(results: readonly ResultSetView[]): HTMLElement {
  const buttons = results.map((result, index) =>
    createElement('button', {
      className: ['tab', index === activeResultIndex ? 'active' : '', result.status === 'error' ? 'failed' : ''].filter(Boolean).join(' '),
      text: `${index + 1}. ${summarizeSql(result.sql, TAB_LABEL_CHARACTERS)}`,
      title: result.sql,
      onClick: () => {
        activeResultIndex = index;
        render();
      },
    }),
  );
  return createElement('div', { className: 'tabs' }, buttons);
}

function renderResult(result: ResultSetView, exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  if (result.status === 'error') {
    return [createElement('div', { className: 'error', text: result.message })];
  }
  if (result.status === 'command') {
    return [createElement('div', { className: 'summary', text: l10n.t('{0} row(s) affected · {1} ms', result.affectedRows, result.durationMs) })];
  }
  return renderRows(result, exportFormats);
}

function renderRows(result: Extract<ResultSetView, { status: 'rows' }>, exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  const summary = createElement('span', { className: 'summary' });
  const selectionActions = createElement('span', { className: 'selection-actions' });

  const describe = (visibleRows: number): string => describeRowCount(visibleRows, result);
  summary.textContent = describe(result.rows.length);

  const grid = new ResultGrid(result.columns, result.rows, {
    onCountChange: (visibleRows) => {
      summary.textContent = describe(visibleRows);
    },
    onOpenValue: (text) => host.postMessage({ type: 'openValue', text }),
    onSelectionChange: (selection) => {
      selectionActions.replaceChildren(...(selection ? renderSelectionActions(grid) : []));
    },
  });

  const filter = createElement('input', { className: 'filter' });
  filter.type = 'search';
  filter.placeholder = l10n.t('Filter rows');
  filter.addEventListener('input', () => grid.setFilter(filter.value));

  const gridTools = createElement('span', { className: 'grid-tools' }, [filter, summary, selectionActions]);
  const columnsKey = result.columns.map((column) => column.name).join(COLUMN_KEY_SEPARATOR);
  const chart = createChartView(result, columnsKey);
  activeChart = chart;

  const viewButtons = (['grid', 'chart'] as const).map((view) =>
    createElement('button', {
      className: 'view-button',
      text: view === 'grid' ? l10n.t('Grid') : l10n.t('Chart'),
      onClick: () => showView(view),
    }),
  );
  const viewSwitch = createElement('span', { className: 'view-switch' }, viewButtons);
  viewSwitch.setAttribute('role', 'group');
  viewSwitch.setAttribute('aria-label', l10n.t('Show the result as'));

  let isChartShown = false;
  const showView = (view: ResultView): void => {
    activeView = view;
    viewButtons.forEach((button, index) => button.classList.toggle('active', (index === 0 ? 'grid' : 'chart') === view));
    grid.element.hidden = view !== 'grid';
    gridTools.hidden = view !== 'grid';
    chart.element.hidden = view !== 'chart';
    if (view === 'grid') {
      queueMicrotask(() => grid.mount());
    } else if (!isChartShown) {
      isChartShown = true;
      queueMicrotask(() => chart.show());
    }
  };
  showView(activeView);

  const toolbar = createElement('div', { className: 'toolbar' }, [
    viewSwitch,
    gridTools,
    createElement('span', { className: 'spacer-flex' }),
    ...renderExportControls(exportFormats),
  ]);

  return [toolbar, grid.element, chart.element];
}

function describeRowCount(visibleRows: number, result: Extract<ResultSetView, { status: 'rows' }>): string {
  const total = result.rows.length;
  const isFiltered = visibleRows !== total;
  if (isFiltered && result.isTruncated) {
    return l10n.t('{0} of {1} row(s) (more available, raise auraDataDockDb.maxRows) · {2} ms', visibleRows, total, result.durationMs);
  }
  if (isFiltered) {
    return l10n.t('{0} of {1} row(s) · {2} ms', visibleRows, total, result.durationMs);
  }
  if (result.isTruncated) {
    return l10n.t('{0} row(s) (more available, raise auraDataDockDb.maxRows) · {1} ms', total, result.durationMs);
  }
  return l10n.t('{0} row(s) · {1} ms', total, result.durationMs);
}

function createChartView(result: Extract<ResultSetView, { status: 'rows' }>, columnsKey: string): ChartView {
  return new ChartView(
    { columns: result.columns.map((column) => column.name), rows: result.rows, isTruncated: result.isTruncated },
    savedChart?.columnsKey === columnsKey ? savedChart.config : undefined,
    {
      onConfigChange: (config) => {
        savedChart = { columnsKey, config };
      },
      onSaveImage: (format, content) => host.postMessage({ type: 'saveChartImage', format, content }),
    },
  );
}

function renderSelectionActions(grid: ResultGrid): HTMLElement[] {
  const copy = (text: string) => host.postMessage({ type: 'copyText', text });
  return [
    createElement('button', { className: 'secondary', text: l10n.t('Copy cell'), onClick: () => copy(grid.getSelectedCell() ?? NULL_TEXT) }),
    createElement('button', { className: 'secondary', text: l10n.t('Copy row'), onClick: () => copy((grid.getSelectedRow() ?? []).map((cell) => cell ?? NULL_TEXT).join(CELL_SEPARATOR)) }),
    createElement('button', { className: 'secondary', text: l10n.t('Copy column'), onClick: () => copy((grid.getSelectedColumnValues() ?? []).map((cell) => cell ?? NULL_TEXT).join('\n')) }),
  ];
}

function renderExportControls(exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  const select = createElement('select', { title: l10n.t('Export format') });
  select.append(...exportFormats.map((format) => {
    const option = createElement('option', { text: format.label });
    option.value = format.id;
    return option;
  }));
  select.value = exportFormatId ?? exportFormats[0]?.id ?? '';
  select.addEventListener('change', () => {
    exportFormatId = select.value as ExportFormatView['id'];
  });

  const send = (destination: 'file' | 'clipboard') =>
    host.postMessage({ type: 'exportResult', resultIndex: activeResultIndex, format: select.value as ExportFormatView['id'], destination });

  return [
    select,
    createElement('button', { className: 'secondary', text: l10n.t('Copy'), title: l10n.t('Copy all rows in this format'), onClick: () => send('clipboard') }),
    createElement('button', { text: l10n.t('Save…'), title: l10n.t('Save all rows to a file'), onClick: () => send('file') }),
  ];
}
