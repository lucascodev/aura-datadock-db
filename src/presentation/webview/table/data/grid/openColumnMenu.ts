import type { FilterOperatorId } from '../../../../../application/editing/model/tableFilters';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import type { TableColumnView } from '../../../../contracts/TableEditorMessages';
import type { DataTabState } from '../state/DataTabState';
import { showColumnMenu } from './showColumnMenu';

const SHORTENED_LENGTH = 24;

export function openColumnMenu(state: DataTabState, column: TableColumnView, anchor: DOMRect, loadFirstPage: () => void): void {
  const activeValue = state.activeCell?.column === column.name ? state.display.cellValue(state.activeCell) : undefined;
  const addFilter = (operator: FilterOperatorId, value = '') => {
    state.view.addFilter({ column: column.name, operator, value });
    loadFirstPage();
  };
  const sortBy = (isDescending: boolean | undefined) => {
    state.view.setSort(column.name, isDescending);
    loadFirstPage();
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
  return text.length > SHORTENED_LENGTH ? `${text.slice(0, SHORTENED_LENGTH)}…` : text;
}
