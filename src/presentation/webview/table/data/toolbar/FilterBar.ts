import { isWholeQuery } from '../../../../../application/editing/browsing/isWholeQuery';
import { FILTER_OPERATORS } from '../../../../../application/editing/constants/filterOperators';
import type { NamespaceSchema } from '../../../../../domain/schema/model/NamespaceSchema';
import { createElement } from '../../../shared/dom/createElement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { createFilterCompletionSource } from '../../sqlField/completion/createFilterCompletionSource';
import { createQueryCompletionSource } from '../../sqlField/completion/createQueryCompletionSource';
import { SqlField } from '../../sqlField/editor/SqlField';
import type { DataTabState } from '../state/DataTabState';

interface FilterBarCallbacks {
  onApply(): void;
  onWholeQuery(sql: string): void;
  onToggleSql(): void;
  onToggleValue(): void;
}

export class FilterBar {
  readonly element: HTMLElement;
  private readonly field: SqlField;
  private readonly chips = createElement('div', { className: 'chips' });
  private readonly sqlButton = createElement('button', { className: 'secondary toggle', text: l10n.t('Show SQL'), title: l10n.t('Show the SQL of this view below the rows'), onClick: () => this.callbacks.onToggleSql() });
  private readonly valueButton = createElement('button', { className: 'secondary toggle', text: l10n.t('Value'), title: l10n.t('Show or hide the value panel'), onClick: () => this.callbacks.onToggleValue() });
  private schema?: NamespaceSchema;

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: FilterBarCallbacks,
  ) {
    this.field = new SqlField({
      className: 'where-input',
      ariaLabel: l10n.t('SQL expression to filter the rows'),
      placeholder: l10n.t('Enter an SQL expression to filter the rows (use Ctrl+Space)'),
      wrapsLines: true,
      submitKey: 'Enter',
      completions: createFilterCompletionSource({
        wholeQuery: createQueryCompletionSource(() => this.schema),
        getKind: () => this.schema?.kind ?? '',
        getColumns: () => this.state.columns,
      }),
      onChange: (value) => this.forgetFilterWhenEmptied(value),
      onSubmit: () => this.apply(),
    });
    this.element = createElement('div', { className: 'filter-bar' }, [
      createElement('div', { className: 'filter-row' }, [
        this.sqlButton,
        createElement('div', { className: 'where-field' }, [this.field.element]),
        createElement('button', { className: 'secondary', text: l10n.t('Apply'), title: l10n.t('Apply the filter (Enter)'), onClick: () => this.apply() }),
        createElement('button', { className: 'secondary', text: l10n.t('Clear'), title: l10n.t('Remove every filter'), onClick: () => this.clear() }),
        this.valueButton,
      ]),
      this.chips,
    ]);
  }

  setSchema(schema: NamespaceSchema): void {
    this.schema = schema;
    this.field.setDriver(schema.kind);
  }

  render(): void {
    this.sqlButton.classList.toggle('active', this.state.isSqlPanelOpen);
    this.valueButton.classList.toggle('active', this.state.isValuePanelOpen);
    this.chips.replaceChildren(...this.state.filters.map((filter, index) => {
      const operator = FILTER_OPERATORS.find((candidate) => candidate.id === filter.operator);
      const text = `${filter.column} ${operator?.label() ?? ''}${operator?.needsValue ? ` ${filter.value}` : ''}`;
      return createElement('button', {
        className: 'chip',
        text: `${text} ×`,
        title: l10n.t('Remove this filter'),
        onClick: () => {
          this.state.view.removeFilter(index);
          this.callbacks.onApply();
        },
      });
    }));
    this.chips.hidden = this.state.filters.length === 0;
  }

  private forgetFilterWhenEmptied(value: string): void {
    if (!value.trim()) {
      this.state.whereExpression = '';
    }
  }

  private apply(): void {
    const text = this.field.value.trim();
    if (isWholeQuery(this.schema?.kind ?? '', text)) {
      this.field.value = '';
      this.state.whereExpression = '';
      this.callbacks.onWholeQuery(text);
      return;
    }
    this.state.whereExpression = text;
    this.callbacks.onApply();
  }

  private clear(): void {
    this.field.value = '';
    this.state.whereExpression = '';
    this.state.filters = [];
    this.callbacks.onApply();
  }
}
