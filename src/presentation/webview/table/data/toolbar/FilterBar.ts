import { applyFilterCompletion, suggestFilterCompletions, type FilterCompletions, type FilterSuggestion } from '../../../../../application/editing/browsing/suggestFilterCompletions';
import { FILTER_OPERATORS } from '../../../../../application/editing/browsing/tableFilters';
import type { DriverId } from '../../../../../domain/driver/DriverId';
import { createElement } from '../../../shared/createElement';
import { l10n } from '../../../../../domain/i18n/l10n';
import type { DataTabState } from '../state/DataTabState';

export interface FilterBarCallbacks {
  onApply(): void;
  onToggleSql(): void;
  onToggleValue(): void;
}

export class FilterBar {
  readonly element: HTMLElement;
  private readonly input = createElement('input', { className: 'where-input' });
  private readonly suggestionList = createElement('div', { className: 'suggestions' });
  private readonly chips = createElement('div', { className: 'chips' });
  private readonly sqlButton = createElement('button', { className: 'secondary toggle', text: l10n.t('Show SQL'), title: l10n.t('Show the SQL of this view below the rows'), onClick: () => this.callbacks.onToggleSql() });
  private readonly valueButton = createElement('button', { className: 'secondary toggle', text: l10n.t('Value'), title: l10n.t('Show or hide the value panel'), onClick: () => this.callbacks.onToggleValue() });
  private kind: DriverId = '';
  private completions?: FilterCompletions;
  private highlighted = 0;

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: FilterBarCallbacks,
  ) {
    this.input.placeholder = l10n.t('Enter an SQL expression to filter the rows (use Ctrl+Space)');
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', l10n.t('SQL expression to filter the rows'));
    this.input.addEventListener('keydown', (event) => this.handleKeyDown(event));
    this.input.addEventListener('blur', () => this.hideSuggestions());
    this.suggestionList.hidden = true;

    const field = createElement('div', { className: 'where-field' }, [this.input, this.suggestionList]);
    this.element = createElement('div', { className: 'filter-bar' }, [
      createElement('div', { className: 'filter-row' }, [
        this.sqlButton,
        field,
        createElement('button', { className: 'secondary', text: l10n.t('Apply'), title: l10n.t('Apply the filter (Enter)'), onClick: () => this.apply() }),
        createElement('button', { className: 'secondary', text: l10n.t('Clear'), title: l10n.t('Remove every filter'), onClick: () => this.clear() }),
        this.valueButton,
      ]),
      this.chips,
    ]);
  }

  setDriver(kind: DriverId): void {
    this.kind = kind;
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
          this.state.removeFilter(index);
          this.callbacks.onApply();
        },
      });
    }));
    this.chips.hidden = this.state.filters.length === 0;
  }

  private apply(): void {
    this.hideSuggestions();
    this.state.whereExpression = this.input.value.trim();
    this.callbacks.onApply();
  }

  private clear(): void {
    this.input.value = '';
    this.state.whereExpression = '';
    this.state.filters = [];
    this.hideSuggestions();
    this.callbacks.onApply();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();
      this.showSuggestions();
    } else if (!this.suggestionList.hidden) {
      this.handleSuggestionKey(event);
    } else if (event.key === 'Enter') {
      this.apply();
    }
  }

  private handleSuggestionKey(event: KeyboardEvent): void {
    const count = this.completions?.suggestions.length ?? 0;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlighted = (this.highlighted + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
      this.renderSuggestions();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const suggestion = this.completions?.suggestions[this.highlighted];
      if (suggestion) {
        this.acceptSuggestion(suggestion);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.hideSuggestions();
    } else {
      queueMicrotask(() => this.showSuggestions());
    }
  }

  private showSuggestions(): void {
    this.completions = suggestFilterCompletions(this.kind, this.input.value, this.input.selectionStart ?? this.input.value.length, this.state.columns);
    this.highlighted = 0;
    if (this.completions.suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    this.renderSuggestions();
    this.suggestionList.hidden = false;
  }

  private renderSuggestions(): void {
    const items = (this.completions?.suggestions ?? []).map((suggestion, index) => {
      const item = createElement('div', { className: index === this.highlighted ? 'suggestion highlighted' : 'suggestion' }, [
        createElement('span', { text: suggestion.label }),
        ...(suggestion.detail ? [createElement('span', { className: 'suggestion-detail', text: suggestion.detail })] : []),
      ]);
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.acceptSuggestion(suggestion);
      });
      return item;
    });
    this.suggestionList.replaceChildren(...items);
  }

  private acceptSuggestion(suggestion: FilterSuggestion): void {
    if (!this.completions) {
      return;
    }
    const result = applyFilterCompletion(this.input.value, this.completions, suggestion);
    this.input.value = result.text;
    this.input.setSelectionRange(result.cursor, result.cursor);
    this.hideSuggestions();
  }

  private hideSuggestions(): void {
    this.suggestionList.hidden = true;
    this.completions = undefined;
  }
}
