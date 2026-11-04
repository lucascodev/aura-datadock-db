import { createElement } from '../../../shared/createElement';
import { l10n } from '../../../../../domain/i18n/l10n';
import type { DataTabState } from '../state/DataTabState';

export interface BottomBarCallbacks {
  onRefresh(): void;
  onSave(): void;
  onCancelChanges(): void;
  onPreview(): void;
  onEditCell(): void;
  onAddRow(): void;
  onDuplicateRow(): void;
  onDeleteRow(): void;
  onSetNull(): void;
  onUseDefault(): void;
  onGoTo(offset: number): void;
  onExport(): void;
  onLimitChange(limit: number): void;
}

export class BottomBar {
  readonly element: HTMLElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private readonly previewButton: HTMLButtonElement;
  private readonly editButton: HTMLButtonElement;
  private readonly addButton: HTMLButtonElement;
  private readonly duplicateButton: HTMLButtonElement;
  private readonly deleteButton: HTMLButtonElement;
  private readonly nullButton: HTMLButtonElement;
  private readonly defaultButton: HTMLButtonElement;
  private readonly firstButton: HTMLButtonElement;
  private readonly previousButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly lastButton: HTMLButtonElement;
  private readonly exportButton: HTMLButtonElement;
  private readonly limitInput = createElement('input', { className: 'limit-input', title: l10n.t('Rows per page') });
  private readonly rangeLabel = createElement('span', { className: 'muted range-label' });
  private readonly statusLabel = createElement('span', { className: 'muted status-label' });

  constructor(
    private readonly state: DataTabState,
    callbacks: BottomBarCallbacks,
  ) {
    this.saveButton = createButton(l10n.t('✓ Save'), l10n.t('Apply the pending changes in a transaction (Ctrl+S)'), callbacks.onSave);
    this.saveButton.className = '';
    this.cancelButton = createButton(l10n.t('✕ Cancel'), l10n.t('Discard the pending changes'), callbacks.onCancelChanges);
    this.previewButton = createButton(l10n.t('Preview SQL'), l10n.t('See the SQL of the pending changes'), callbacks.onPreview);
    this.editButton = createButton(l10n.t('✎ Edit'), l10n.t('Edit the selected cell (F2)'), callbacks.onEditCell);
    this.addButton = createButton(l10n.t('+ Add'), l10n.t('Add a new row'), callbacks.onAddRow);
    this.duplicateButton = createButton(l10n.t('⧉ Duplicate'), l10n.t('Duplicate the selected rows'), callbacks.onDuplicateRow);
    this.deleteButton = createButton(l10n.t('− Delete'), l10n.t('Mark the selected rows for deletion (Delete)'), callbacks.onDeleteRow);
    this.nullButton = createButton('NULL', l10n.t('Set the selected cell to NULL'), callbacks.onSetNull);
    this.defaultButton = createButton(l10n.t('Default'), l10n.t('Leave the selected cell of a new row to the database default'), callbacks.onUseDefault);
    this.firstButton = createButton('|◀', l10n.t('First page'), () => callbacks.onGoTo(0));
    this.previousButton = createButton('◀', l10n.t('Previous page'), () => callbacks.onGoTo(Math.max(0, this.state.offset - this.state.limit)));
    this.nextButton = createButton('▶', l10n.t('Next page'), () => callbacks.onGoTo(this.state.offset + this.state.limit));
    this.lastButton = createButton('▶|', l10n.t('Last page'), () => callbacks.onGoTo(this.state.lastOffset()));
    this.exportButton = createButton(l10n.t('Export data'), l10n.t('Export every row matching the current filters'), callbacks.onExport);

    this.limitInput.type = 'number';
    this.limitInput.min = '1';
    this.limitInput.addEventListener('change', () => callbacks.onLimitChange(Number(this.limitInput.value)));

    this.element = createElement('div', { className: 'bottom-bar' }, [
      createElement('div', { className: 'bar-group' }, [createButton(l10n.t('⟳ Refresh'), l10n.t('Read the rows again'), callbacks.onRefresh), this.saveButton, this.cancelButton, this.previewButton]),
      createElement('div', { className: 'bar-group' }, [this.editButton, this.addButton, this.duplicateButton, this.deleteButton, this.nullButton, this.defaultButton]),
      createElement('div', { className: 'bar-group' }, [this.firstButton, this.previousButton, this.nextButton, this.lastButton]),
      createElement('div', { className: 'bar-group' }, [this.exportButton, this.limitInput, this.rangeLabel]),
      this.statusLabel,
    ]);
  }

  render(): void {
    const { state } = this;
    const pendingCount = state.changes.length;
    const isCustom = state.isCustomResult;

    this.saveButton.textContent = pendingCount > 0 ? l10n.t('✓ Save ({0})', pendingCount) : l10n.t('✓ Save');
    this.saveButton.disabled = pendingCount === 0 || state.isBusy;
    this.cancelButton.disabled = pendingCount === 0;
    this.previewButton.disabled = pendingCount === 0;
    this.editButton.disabled = !state.activeCell || !state.isCellEditable(state.activeCell);
    this.addButton.disabled = isCustom || !state.editability.canInsert;
    this.duplicateButton.disabled = !state.canDuplicate();
    this.deleteButton.disabled = !state.canDelete();
    this.nullButton.disabled = !state.canSetNull();
    this.defaultButton.disabled = !state.canUseDefault();
    this.firstButton.disabled = !state.canGoPrevious();
    this.previousButton.disabled = !state.canGoPrevious();
    this.nextButton.disabled = !state.canGoNext();
    this.lastButton.disabled = !state.canGoLast();
    this.exportButton.disabled = isCustom;
    this.limitInput.disabled = isCustom;
    if (document.activeElement !== this.limitInput) {
      this.limitInput.value = String(state.limit);
    }
    this.rangeLabel.textContent = isCustom ? '' : describeRange(state);
    this.statusLabel.textContent = state.rowCountLabel();
  }
}

function createButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  return createElement('button', { className: 'secondary', text, title, onClick });
}

function describeRange(state: DataTabState): string {
  const range = state.rows.length > 0 ? `${state.offset + 1}–${state.offset + state.rows.length}` : '0';
  return state.total === undefined ? range : l10n.t('{0} of {1}', range, state.total);
}
