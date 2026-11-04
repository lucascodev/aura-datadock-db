import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { TableEditorHostMessage } from '../../../contracts/TableEditorMessages';
import type { TableScreen } from '../screen/TableScreen';

type PageMessage = Extract<TableEditorHostMessage, { type: 'page' }>;
type InitMessage = Extract<TableEditorHostMessage, { type: 'init' }>;

export class HostMessageReceiver {
  constructor(private readonly screen: TableScreen) {}

  handle(message: TableEditorHostMessage): void {
    switch (message.type) {
      case 'init':
        this.applyInit(message);
        return;
      case 'page':
        this.showPage(message);
        return;
      case 'count':
        this.screen.state.total = message.total;
        this.screen.renderDetails();
        return;
      case 'saved':
        this.finishSave(message.affectedRows);
        return;
      case 'customResult':
        this.showCustomResult(message.result);
        return;
      case 'scriptFinished':
        this.screen.showStatus(l10n.t('The SQL was sent. See the outcome in the results panel.'), 'success');
        this.screen.loadPage();
        return;
      case 'chartFinished':
        this.finishChart();
        return;
      case 'failed':
        this.fail(message.message);
        return;
    }
  }

  private applyInit(message: InitMessage): void {
    const { state, host, filterBar, propertiesTab, diagramTab } = this.screen;
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
      state.editing.addRow();
      host.postMessage({ type: 'pendingChanged', changes: state.changes });
    }
    if (isFirstInit) {
      this.screen.loadPage(0);
    } else {
      this.screen.render();
    }
  }

  private showPage(message: PageMessage): void {
    this.screen.state.applyPage(message.request, message.rows, message.durationMs, message.sql);
    this.screen.clearFailure();
    this.screen.render();
  }

  private finishSave(affectedRows: number): void {
    this.screen.state.editing.applySaved();
    this.screen.showStatus(l10n.t('Saved. {0} row(s) affected.', affectedRows), 'success');
    this.screen.loadPage();
  }

  private showCustomResult(result: Extract<TableEditorHostMessage, { type: 'customResult' }>['result']): void {
    this.screen.state.applyCustomResult(result);
    this.screen.showStatus('', 'success');
    this.screen.render();
  }

  private finishChart(): void {
    this.screen.showStatus(l10n.t('The SQL was sent. See the outcome in the results panel.'), 'success');
    this.screen.state.isBusy = false;
    this.screen.render();
  }

  private fail(text: string): void {
    this.screen.showStatus(text, 'failure');
    this.screen.state.isBusy = false;
    this.screen.render();
  }
}
