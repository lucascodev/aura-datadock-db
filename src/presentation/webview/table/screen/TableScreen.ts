import { renderTextTable } from '../../../../application/editing/browsing/renderTextTable';
import type { CellPosition } from '../../../../application/editing/grid/model/CellPosition';
import type { CellValue } from '../../../../domain/database/model/ParameterizedStatement';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import { DATA_VIEW_MODES } from '../constants/dataViewModes';
import type { DataGrid } from '../data/grid/DataGrid';
import { DataTabState } from '../data/state/DataTabState';
import type { BottomBar } from '../data/toolbar/BottomBar';
import type { FilterBar } from '../data/toolbar/FilterBar';
import type { RecordView } from '../data/panels/RecordView';
import type { SqlPanel } from '../data/panels/SqlPanel';
import type { ValuePanel } from '../data/panels/ValuePanel';
import { DiagramTab } from '../diagram/DiagramTab';
import { buildDataTab } from '../layout/buildDataTab';
import { buildTableTabs } from '../layout/buildTableTabs';
import { createModeButtons } from '../layout/createModeButtons';
import type { HostPort } from '../model/HostPort';
import { PropertiesTab } from '../properties/PropertiesTab';
import { createBottomBar } from '../wiring/createBottomBar';
import { createDataGrid } from '../wiring/createDataGrid';
import { createFilterBar } from '../wiring/createFilterBar';
import { createRecordView } from '../wiring/createRecordView';
import { createSqlPanel } from '../wiring/createSqlPanel';
import { createValuePanel } from '../wiring/createValuePanel';

export class TableScreen {
  readonly state = new DataTabState();
  readonly filterBar: FilterBar;
  readonly propertiesTab: PropertiesTab;
  readonly diagramTab: DiagramTab;
  private readonly statusLine = createElement('div', { className: 'status' });
  private readonly noticeBanner = createElement('div', { className: 'notice' });
  private readonly customBanner = createElement('div', { className: 'notice' });
  private readonly textView = createElement('pre', { className: 'text-view' });
  private readonly grid: DataGrid;
  private readonly valuePanel: ValuePanel;
  private readonly recordView: RecordView;
  private readonly sqlPanel: SqlPanel;
  private readonly bottomBar: BottomBar;
  private readonly modeButtons: HTMLElement[];

  constructor(
    readonly host: HostPort,
    app: HTMLElement,
  ) {
    this.statusLine.setAttribute('role', 'status');
    this.filterBar = createFilterBar(this);
    this.grid = createDataGrid(this);
    this.valuePanel = createValuePanel(this);
    this.recordView = createRecordView(this);
    this.sqlPanel = createSqlPanel(this);
    this.bottomBar = createBottomBar(this, this.grid);
    this.propertiesTab = new PropertiesTab({ onCopy: (text) => this.copy(text), onOpenSql: (sql) => this.openSql(sql), onOpenTable: (table) => this.openTable(table) });
    this.diagramTab = new DiagramTab((table) => this.openTable(table));
    this.modeButtons = createModeButtons((mode) => {
      this.state.mode = mode;
      this.render();
    });
    app.append(buildTableTabs(this.propertiesTab.element, this.buildDataTab(), this.diagramTab).element);
  }

  copy(text: string): void {
    this.host.postMessage({ type: 'copyText', text });
  }

  openSql(sql: string): void {
    this.host.postMessage({ type: 'openSql', sql });
  }

  openTable(table: string): void {
    this.host.postMessage({ type: 'openTable', table });
  }

  loadPage(offset = this.state.offset): void {
    this.setBusy();
    this.host.postMessage({ type: 'loadPage', request: this.state.view.request(offset) });
  }

  runWholeQuery(sql: string): void {
    this.state.isSqlPanelOpen = true;
    this.sqlPanel.runText(sql);
    this.render();
  }

  setBusy(): void {
    this.state.isBusy = true;
    this.renderDetails();
  }

  save(): void {
    if (this.state.changes.length === 0 || this.state.isBusy) {
      return;
    }
    this.state.isBusy = true;
    this.showStatus(l10n.t('Saving…'), 'success');
    this.renderDetails();
    this.host.postMessage({ type: 'save', changes: this.state.changes });
  }

  commitCell(position: CellPosition, value: CellValue): void {
    this.state.editing.commitCell(position, value);
    this.publishChanges();
  }

  publishChanges(): void {
    this.host.postMessage({ type: 'pendingChanged', changes: this.state.changes });
    this.render();
  }

  showStatus(text: string, kind: 'success' | 'failure'): void {
    this.statusLine.textContent = text;
    this.statusLine.className = `status ${kind}`;
  }

  clearFailure(): void {
    if (this.statusLine.classList.contains('failure')) {
      this.showStatus('', 'success');
    }
  }

  render(): void {
    this.renderBanners();
    this.renderViewVisibility();
    this.renderActiveView();
    this.filterBar.render();
    this.sqlPanel.render();
    this.renderDetails();
  }

  renderDetails(): void {
    this.valuePanel.render();
    this.bottomBar.render();
  }

  private buildDataTab(): HTMLElement {
    return buildDataTab({
      filterBar: this.filterBar.element,
      noticeBanner: this.noticeBanner,
      customBanner: this.customBanner,
      statusLine: this.statusLine,
      modeButtons: this.modeButtons,
      grid: this.grid.element,
      textView: this.textView,
      recordView: this.recordView.element,
      valuePanel: this.valuePanel.element,
      bottomBar: this.bottomBar.element,
      sqlPanel: this.sqlPanel.element,
    });
  }

  private renderBanners(): void {
    this.noticeBanner.textContent = this.state.editability.notice ?? '';
    this.noticeBanner.hidden = !this.state.editability.notice;
    this.customBanner.textContent = l10n.t('Showing the result of the SQL below. It is read-only; use Back to Table to edit the rows.');
    this.customBanner.hidden = !this.state.isCustomResult;
  }

  private renderViewVisibility(): void {
    const { mode } = this.state;
    this.modeButtons.forEach((button, index) => button.classList.toggle('active', DATA_VIEW_MODES[index].id === mode));
    this.grid.element.hidden = mode !== 'grid';
    this.textView.hidden = mode !== 'text';
    this.recordView.element.hidden = mode !== 'record';
    this.valuePanel.element.hidden = !this.state.isValuePanelOpen;
  }

  private renderActiveView(): void {
    if (this.state.mode === 'grid') {
      this.grid.render();
    } else if (this.state.mode === 'text') {
      this.textView.textContent = renderTextTable(this.state.displayColumns.map((column) => column.name), this.state.display.displayRows().map((row) => row.values.map((value) => value ?? null)));
    } else {
      this.recordView.render();
    }
  }
}
