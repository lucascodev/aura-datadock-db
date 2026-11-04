import type { NamespaceSchema } from '../../../../../domain/schema/model/NamespaceSchema';
import { createElement } from '../../../shared/dom/createElement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { createQueryCompletionSource } from '../../sqlField/completion/createQueryCompletionSource';
import { SqlField } from '../../sqlField/editor/SqlField';
import type { DataTabState } from '../state/DataTabState';

interface SqlPanelCallbacks {
  onRun(sql: string): void;
  onChart(sql: string): void;
  onOpenInEditor(sql: string): void;
  onCopy(sql: string): void;
  onBackToTable(): void;
}

export class SqlPanel {
  readonly element: HTMLElement;
  private readonly editor: SqlField;
  private readonly backButton = createElement('button', { className: 'secondary', text: l10n.t('Back to Table'), title: l10n.t('Show the rows of this table again'), onClick: () => this.callbacks.onBackToTable() });
  private isEdited = false;
  private schema?: NamespaceSchema;

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: SqlPanelCallbacks,
  ) {
    this.editor = new SqlField({
      className: 'sql-editor',
      ariaLabel: l10n.t('SQL of this view'),
      wrapsLines: false,
      submitKey: 'Mod-Enter',
      completions: createQueryCompletionSource(() => this.schema),
      onChange: (value) => {
        this.isEdited = value !== this.state.pageSql;
      },
      onSubmit: () => this.run(),
    });
    this.element = createElement('div', { className: 'sql-panel' }, [
      createElement('div', { className: 'sql-actions' }, [
        createElement('button', { text: l10n.t('▶ Run'), title: l10n.t('Run this SQL (Ctrl+Enter)'), onClick: () => this.run() }),
        createElement('button', { className: 'secondary', text: l10n.t('Chart'), title: l10n.t('Run this query and show the result as a chart'), onClick: () => this.chart() }),
        this.backButton,
        createElement('button', { className: 'secondary', text: l10n.t('Reset'), title: l10n.t('Go back to the SQL of this view'), onClick: () => this.reset() }),
        createElement('button', { className: 'secondary', text: l10n.t('Copy'), onClick: () => this.callbacks.onCopy(this.editor.value) }),
        createElement('button', { className: 'secondary', text: l10n.t('Open in Editor'), title: l10n.t('Open in a SQL editor, with autocomplete'), onClick: () => this.callbacks.onOpenInEditor(this.editor.value) }),
      ]),
      this.editor.element,
    ]);
  }

  setSchema(schema: NamespaceSchema): void {
    this.schema = schema;
    this.editor.setDriver(schema.kind);
  }

  render(): void {
    this.element.hidden = !this.state.isSqlPanelOpen;
    this.backButton.hidden = !this.state.isCustomResult;
    if (!this.isEdited) {
      this.editor.value = this.state.pageSql;
    }
  }

  runText(sql: string): void {
    this.editor.value = sql;
    this.isEdited = true;
    this.run();
  }

  private run(): void {
    if (this.editor.value.trim()) {
      this.callbacks.onRun(this.editor.value);
    }
  }

  private chart(): void {
    if (this.editor.value.trim()) {
      this.callbacks.onChart(this.editor.value);
    }
  }

  private reset(): void {
    this.isEdited = false;
    this.editor.value = this.state.pageSql;
  }
}
