import { renderTextTable } from '../../../application/editing/browsing/renderTextTable';
import type { FilterOperatorId } from '../../../application/editing/browsing/tableFilters';
import type { CellValue } from '../../../domain/database/ParameterizedStatement';
import type { TableColumnView, TableEditorHostMessage, TableEditorWebviewMessage } from '../../contracts/TableEditorMessages';
import { l10n, useL10nCatalog } from '../../../domain/i18n/l10n';
import { readL10nCatalog } from '../shared/readL10nCatalog';
import { createElement } from '../shared/createElement';
import { Tabs } from '../shared/Tabs';
import { connectToHost } from '../shared/vscodeApi';
import { BottomBar } from './data/toolbar/BottomBar';
import { showColumnMenu } from './data/grid/ColumnMenu';
import { DataGrid } from './data/grid/DataGrid';
import { DataTabState, type CellPosition, type DataViewMode } from './data/state/DataTabState';
import { DiagramTab } from './diagram/DiagramTab';
import { FilterBar } from './data/toolbar/FilterBar';
import { PropertiesTab } from './properties/PropertiesTab';
import { RecordView } from './data/panels/RecordView';
import { SqlPanel } from './data/panels/SqlPanel';
import { ValuePanel } from './data/panels/ValuePanel';

useL10nCatalog(readL10nCatalog());

type TableTabId = 'properties' | 'data' | 'diagram';

const MODES: readonly { readonly id: DataViewMode; readonly label: () => string; readonly title: () => string }[] = [
  { id: 'grid', label: () => l10n.t('Grid'), title: () => l10n.t('Rows in a grid') },
  { id: 'text', label: () => l10n.t('Text'), title: () => l10n.t('Rows as aligned text') },
  { id: 'record', label: () => l10n.t('Record'), title: () => l10n.t('One row at a time') },
];

const host = connectToHost<TableEditorWebviewMessage>();
const app = document.getElementById('app') as HTMLElement;
const state = new DataTabState();

const statusLine = createElement('div', { className: 'status' });
statusLine.setAttribute('role', 'status');
const noticeBanner = createElement('div', { className: 'notice' });
const customBanner = createElement('div', { className: 'notice' });
const textView = createElement('pre', { className: 'text-view' });

const copy = (text: string) => host.postMessage({ type: 'copyText', text });
const openSql = (sql: string) => host.postMessage({ type: 'openSql', sql });
const openTable = (table: string) => host.postMessage({ type: 'openTable', table });

const filterBar = new FilterBar(state, {
  onApply: () => loadPage(0),
  onToggleSql: () => {
    state.isSqlPanelOpen = !state.isSqlPanelOpen;
    render();
  },
  onToggleValue: () => {
    state.isValuePanelOpen = !state.isValuePanelOpen;
    render();
  },
});

const grid = new DataGrid(state, {
  onActiveCellChange: renderDetails,
  onCommitCell: commitCell,
  onSelectionChange: renderDetails,
  onSort: (column) => {
    state.cycleSort(column);
    loadPage(0);
  },
  onOpenColumnMenu: openColumnMenu,
  onDeleteRows: () => {
    state.deleteTargetRows();
    publishChanges();
  },
  onSave: save,
  onCopy: copy,
});

const valuePanel = new ValuePanel(state, {
  onCommit: commitCell,
  onSetNull: () => {
    state.setActiveNull();
    publishChanges();
  },
});

const recordView = new RecordView(state, {
  onCommit: commitCell,
  onMove: (delta) => {
    state.moveRecord(delta);
    render();
  },
  onSelectField: (position) => {
    state.selectCell(position);
    renderDetails();
  },
});

const sqlPanel = new SqlPanel(state, {
  onRun: (sql) => {
    setBusy();
    host.postMessage({ type: 'runSql', sql, limit: state.limit });
  },
  onOpenInEditor: openSql,
  onCopy: copy,
  onBackToTable: () => loadPage(),
});

const bottomBar = new BottomBar(state, {
  onRefresh: () => loadPage(),
  onSave: save,
  onCancelChanges: () => {
    state.discardChanges();
    showStatus('', 'success');
    publishChanges();
  },
  onPreview: () => host.postMessage({ type: 'preview', changes: state.changes }),
  onEditCell: () => {
    if (state.activeCell) {
      grid.startEdit(state.activeCell);
    }
  },
  onAddRow: () => {
    state.addRow();
    publishChanges();
    grid.element.scrollTop = 0;
  },
  onDuplicateRow: () => {
    state.duplicateTargetRows();
    publishChanges();
    grid.element.scrollTop = 0;
  },
  onDeleteRow: () => {
    state.deleteTargetRows();
    publishChanges();
  },
  onSetNull: () => {
    state.setActiveNull();
    publishChanges();
  },
  onUseDefault: () => {
    state.useDefaultForActive();
    publishChanges();
  },
  onGoTo: (offset) => loadPage(offset),
  onExport: () => host.postMessage({ type: 'exportData', selection: state.selection() }),
  onLimitChange: (limit) => {
    state.setLimit(limit);
    loadPage(0);
  },
});

const propertiesTab = new PropertiesTab({ onCopy: copy, onOpenSql: openSql, onOpenTable: openTable });
const diagramTab = new DiagramTab(openTable);

const modeButtons = MODES.map((mode) =>
  createElement('button', {
    className: 'mode-button',
    text: mode.label(),
    title: mode.title(),
    onClick: () => {
      state.mode = mode.id;
      render();
    },
  }),
);

const dataTab = createElement('div', { className: 'data-tab' }, [
  filterBar.element,
  noticeBanner,
  customBanner,
  statusLine,
  createElement('div', { className: 'data-body' }, [
    createElement('div', { className: 'mode-rail' }, modeButtons),
    createElement('div', { className: 'data-content' }, [grid.element, textView, recordView.element]),
    valuePanel.element,
  ]),
  bottomBar.element,
  sqlPanel.element,
]);

const tableTabs = new Tabs<TableTabId>(
  [
    { id: 'properties', label: l10n.t('Properties'), content: [propertiesTab.element] },
    { id: 'data', label: l10n.t('Data'), content: [dataTab] },
    { id: 'diagram', label: l10n.t('Diagram'), content: [diagramTab.element] },
  ],
  (id) => {
    if (id === 'diagram') {
      diagramTab.handleShown();
    }
  },
);
tableTabs.select('data');
app.append(tableTabs.element);

window.addEventListener('message', (event: MessageEvent<TableEditorHostMessage>) => handleHostMessage(event.data));
host.postMessage({ type: 'ready' });

function handleHostMessage(message: TableEditorHostMessage): void {
  switch (message.type) {
    case 'init':
      applyInit(message);
      return;
    case 'page':
      state.applyPage(message.request, message.rows, message.durationMs, message.sql);
      clearFailure();
      render();
      return;
    case 'count':
      state.total = message.total;
      renderDetails();
      return;
    case 'saved':
      state.applySaved();
      showStatus(l10n.t('Saved. {0} row(s) affected.', message.affectedRows), 'success');
      loadPage();
      return;
    case 'customResult':
      state.applyCustomResult(message.result);
      showStatus('', 'success');
      render();
      return;
    case 'scriptFinished':
      showStatus(l10n.t('The SQL was sent. See the outcome in the results panel.'), 'success');
      loadPage();
      return;
    case 'failed':
      showStatus(message.message, 'failure');
      state.isBusy = false;
      render();
      return;
  }
}

function applyInit(message: Extract<TableEditorHostMessage, { type: 'init' }>): void {
  const isFirstInit = state.columns.length === 0;
  state.columns = message.columns;
  state.primaryKey = message.primaryKey;
  state.editability = message.editability;
  if (isFirstInit) {
    state.limit = message.pageSize;
  }
  state.changes = state.changes.length > 0 ? state.changes : message.changes;
  filterBar.setDriver(message.properties.diagramSchema.kind);
  propertiesTab.render(message.properties);
  diagramTab.render(message.properties);

  if (message.shouldAddRow && state.editability.canInsert) {
    state.addRow();
    host.postMessage({ type: 'pendingChanged', changes: state.changes });
  }
  if (isFirstInit) {
    loadPage(0);
  } else {
    render();
  }
}

function loadPage(offset = state.offset): void {
  setBusy();
  host.postMessage({ type: 'loadPage', request: state.request(offset) });
}

function setBusy(): void {
  state.isBusy = true;
  renderDetails();
}

function save(): void {
  if (state.changes.length === 0 || state.isBusy) {
    return;
  }
  state.isBusy = true;
  showStatus(l10n.t('Saving…'), 'success');
  renderDetails();
  host.postMessage({ type: 'save', changes: state.changes });
}

function commitCell(position: CellPosition, value: CellValue): void {
  state.commitCell(position, value);
  publishChanges();
}

function publishChanges(): void {
  host.postMessage({ type: 'pendingChanged', changes: state.changes });
  render();
}

function showStatus(text: string, kind: 'success' | 'failure'): void {
  statusLine.textContent = text;
  statusLine.className = `status ${kind}`;
}

function clearFailure(): void {
  if (statusLine.classList.contains('failure')) {
    showStatus('', 'success');
  }
}

function openColumnMenu(column: TableColumnView, anchor: DOMRect): void {
  const activeValue = state.activeCell?.column === column.name ? state.cellValue(state.activeCell) : undefined;
  const addFilter = (operator: FilterOperatorId, value = '') => {
    state.addFilter({ column: column.name, operator, value });
    loadPage(0);
  };
  const sortBy = (isDescending: boolean | undefined) => {
    state.setSort(column.name, isDescending);
    loadPage(0);
  };
  const hasFilterValue = activeValue !== undefined && activeValue !== null;

  showColumnMenu(anchor, [
    { label: l10n.t('Sort ascending'), onSelect: () => sortBy(false) },
    { label: l10n.t('Sort descending'), onSelect: () => sortBy(true) },
    { label: l10n.t('Remove sort'), isEnabled: state.sort?.column === column.name, onSelect: () => sortBy(undefined) },
    { label: hasFilterValue ? `= ${shorten(activeValue)}` : l10n.t('= selected cell'), isEnabled: hasFilterValue, onSelect: () => addFilter('equals', activeValue ?? '') },
    { label: hasFilterValue ? `≠ ${shorten(activeValue)}` : l10n.t('≠ selected cell'), isEnabled: hasFilterValue, onSelect: () => addFilter('notEquals', activeValue ?? '') },
    { label: hasFilterValue ? l10n.t('Contains {0}', shorten(activeValue)) : l10n.t('Contains selected cell'), isEnabled: hasFilterValue, onSelect: () => addFilter('contains', activeValue ?? '') },
    { label: l10n.t('Is NULL'), onSelect: () => addFilter('isNull') },
    { label: l10n.t('Is not NULL'), onSelect: () => addFilter('isNotNull') },
  ]);
}

function shorten(text: string): string {
  const LIMIT = 24;
  return text.length > LIMIT ? `${text.slice(0, LIMIT)}…` : text;
}

function render(): void {
  noticeBanner.textContent = state.editability.notice ?? '';
  noticeBanner.hidden = !state.editability.notice;
  customBanner.textContent = l10n.t('Showing the result of the SQL below. It is read-only; use Back to Table to edit the rows.');
  customBanner.hidden = !state.isCustomResult;
  modeButtons.forEach((button, index) => button.classList.toggle('active', MODES[index].id === state.mode));

  grid.element.hidden = state.mode !== 'grid';
  textView.hidden = state.mode !== 'text';
  recordView.element.hidden = state.mode !== 'record';
  valuePanel.element.hidden = !state.isValuePanelOpen;

  if (state.mode === 'grid') {
    grid.render();
  } else if (state.mode === 'text') {
    textView.textContent = renderTextTable(state.displayColumns.map((column) => column.name), state.displayRows().map((row) => row.values.map((value) => value ?? null)));
  } else {
    recordView.render();
  }
  filterBar.render();
  sqlPanel.render();
  renderDetails();
}

function renderDetails(): void {
  valuePanel.render();
  bottomBar.render();
}
