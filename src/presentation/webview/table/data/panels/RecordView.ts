import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { createElement } from '../../../shared/createElement';
import type { DataTabState } from '../state/DataTabState';
import type { CellPosition } from '../model/CellPosition';

interface RecordViewCallbacks {
  onCommit(position: CellPosition, value: CellValue): void;
  onMove(delta: number): void;
  onSelectField(position: CellPosition): void;
}

export class RecordView {
  readonly element = createElement('div', { className: 'record-view' });

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: RecordViewCallbacks,
  ) {}

  render(): void {
    const { index, count } = this.state.recordPosition();
    const row = this.state.displayRows()[index];
    const navigation = createElement('div', { className: 'record-navigation' }, [
      this.navigationButton(l10n.t('Previous'), index > 0, -1),
      createElement('span', { className: 'muted', text: count > 0 ? l10n.t('Record {0} of {1}', index + 1, count) : l10n.t('No records') }),
      this.navigationButton(l10n.t('Next'), index < count - 1, 1),
    ]);
    if (!row) {
      this.element.replaceChildren(navigation);
      return;
    }

    const fields = this.state.displayColumns.map((column, position) => {
      const cell: CellPosition = { rowId: row.rowId, column: column.name };
      const value = row.values[position];
      const input = createElement('input', { className: value === null || value === undefined ? 'record-input empty' : 'record-input' });
      input.value = value ?? '';
      input.placeholder = value === null ? '[NULL]' : value === undefined ? l10n.t('default') : '';
      input.readOnly = !this.state.isCellEditable(cell);
      input.spellcheck = false;
      input.setAttribute('aria-label', column.name);
      input.addEventListener('focus', () => this.callbacks.onSelectField(cell));
      input.addEventListener('change', () => this.callbacks.onCommit(cell, input.value));
      const label = createElement('label', { className: 'record-label' }, [
        createElement('span', { text: column.name }),
        ...(column.dataType ? [createElement('span', { className: 'muted', text: column.dataType })] : []),
      ]);
      return createElement('div', { className: row.changedColumns.has(column.name) ? 'record-field changed' : 'record-field' }, [label, input]);
    });
    this.element.replaceChildren(navigation, createElement('div', { className: 'record-fields' }, fields));
  }

  private navigationButton(text: string, isEnabled: boolean, delta: number): HTMLElement {
    const button = createElement('button', { className: 'secondary', text, onClick: () => this.callbacks.onMove(delta) });
    button.disabled = !isEnabled;
    return button;
  }
}
