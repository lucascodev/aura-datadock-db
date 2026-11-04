import type { CellValue } from '../../../../../domain/database/ParameterizedStatement';
import { createElement } from '../../../shared/createElement';
import { l10n } from '../../../../../domain/i18n/l10n';
import type { DataTabState } from '../state/DataTabState';
import type { CellPosition } from '../model/CellPosition';

const JSON_START = /^[[{]/;
const JSON_INDENT = 2;

interface ValuePanelCallbacks {
  onCommit(position: CellPosition, value: CellValue): void;
  onSetNull(): void;
}

export class ValuePanel {
  readonly element: HTMLElement;
  private readonly title = createElement('div', { className: 'value-title' });
  private readonly detail = createElement('div', { className: 'value-detail' });
  private readonly editor = createElement('textarea', { className: 'value-editor' });
  private readonly saveButton = createElement('button', { className: 'secondary', text: l10n.t('Apply'), title: l10n.t('Apply this value to the cell'), onClick: () => this.commit() });
  private readonly nullButton = createElement('button', { className: 'secondary', text: l10n.t('Set NULL'), onClick: () => this.callbacks.onSetNull() });
  private shownText = '';
  private shownPosition?: CellPosition;

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: ValuePanelCallbacks,
  ) {
    this.editor.spellcheck = false;
    this.editor.setAttribute('aria-label', l10n.t('Value of the selected cell'));
    this.editor.addEventListener('input', () => {
      this.saveButton.disabled = this.editor.readOnly || this.editor.value === this.shownText;
    });
    this.element = createElement('aside', { className: 'value-panel' }, [
      this.title,
      this.detail,
      this.editor,
      createElement('div', { className: 'value-actions' }, [this.saveButton, this.nullButton]),
    ]);
  }

  render(): void {
    const { activeCell } = this.state;
    if (!activeCell) {
      this.showEmpty();
      return;
    }
    const column = this.state.displayColumns.find((candidate) => candidate.name === activeCell.column);
    const value = this.state.cellValue(activeCell);
    const isEditable = this.state.isCellEditable(activeCell);

    this.shownPosition = activeCell;
    this.shownText = formatForReading(value);
    this.title.textContent = activeCell.column;
    this.detail.textContent = [column?.dataType, value === null ? 'NULL' : undefined, value === undefined ? l10n.t('database default') : undefined, isEditable ? undefined : l10n.t('read-only')].filter(Boolean).join(' · ');
    this.editor.value = this.shownText;
    this.editor.readOnly = !isEditable;
    this.saveButton.disabled = true;
    this.nullButton.disabled = !this.state.canSetNull();
  }

  private showEmpty(): void {
    this.shownPosition = undefined;
    this.title.textContent = l10n.t('Value');
    this.detail.textContent = l10n.t('Select a cell');
    this.editor.value = '';
    this.editor.readOnly = true;
    this.saveButton.disabled = true;
    this.nullButton.disabled = true;
  }

  private commit(): void {
    if (this.shownPosition && this.editor.value !== this.shownText) {
      this.callbacks.onCommit(this.shownPosition, this.editor.value);
    }
  }
}

function formatForReading(value: CellValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (!JSON_START.test(value.trim())) {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value), null, JSON_INDENT);
  } catch {
    return value;
  }
}
