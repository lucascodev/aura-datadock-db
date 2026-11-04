import { createElement } from '../../../shared/createElement';
import { l10n } from '../../../../../domain/i18n/l10n';
import type { DataTabState } from '../state/DataTabState';

export interface SqlPanelCallbacks {
  onRun(sql: string): void;
  onOpenInEditor(sql: string): void;
  onCopy(sql: string): void;
  onBackToTable(): void;
}

export class SqlPanel {
  readonly element: HTMLElement;
  private readonly editor = createElement('textarea', { className: 'sql-editor' });
  private readonly backButton = createElement('button', { className: 'secondary', text: l10n.t('Back to Table'), title: l10n.t('Show the rows of this table again'), onClick: () => this.callbacks.onBackToTable() });
  private isEdited = false;

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: SqlPanelCallbacks,
  ) {
    this.editor.spellcheck = false;
    this.editor.setAttribute('aria-label', l10n.t('SQL of this view'));
    this.editor.addEventListener('input', () => {
      this.isEdited = this.editor.value !== this.state.pageSql;
    });
    this.editor.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.run();
      }
    });

    this.element = createElement('div', { className: 'sql-panel' }, [
      createElement('div', { className: 'sql-actions' }, [
        createElement('button', { text: l10n.t('▶ Run'), title: l10n.t('Run this SQL (Ctrl+Enter)'), onClick: () => this.run() }),
        this.backButton,
        createElement('button', { className: 'secondary', text: l10n.t('Reset'), title: l10n.t('Go back to the SQL of this view'), onClick: () => this.reset() }),
        createElement('button', { className: 'secondary', text: l10n.t('Copy'), onClick: () => this.callbacks.onCopy(this.editor.value) }),
        createElement('button', { className: 'secondary', text: l10n.t('Open in Editor'), title: l10n.t('Open in a SQL editor, with autocomplete'), onClick: () => this.callbacks.onOpenInEditor(this.editor.value) }),
      ]),
      this.editor,
    ]);
  }

  render(): void {
    this.element.hidden = !this.state.isSqlPanelOpen;
    this.backButton.hidden = !this.state.isCustomResult;
    if (!this.isEdited) {
      this.editor.value = this.state.pageSql;
    }
  }

  private run(): void {
    if (this.editor.value.trim()) {
      this.callbacks.onRun(this.editor.value);
    }
  }

  private reset(): void {
    this.isEdited = false;
    this.editor.value = this.state.pageSql;
  }
}
