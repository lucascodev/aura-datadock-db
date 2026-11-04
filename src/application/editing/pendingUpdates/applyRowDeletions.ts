import { NEW_ROW_PREFIX } from '../constants/rowIdPrefixes';
import { removeInsert } from '../pendingInserts/removeInsert';
import type { CellValues, RowChange } from '../model/RowChange';
import { toggleDeletion } from './toggleDeletion';

export function applyRowDeletions(changes: readonly RowChange[], rowIds: readonly string[], canDelete: boolean, isIdentified: (rowId: string) => boolean): readonly RowChange[] {
  return rowIds.reduce((current, rowId) => {
    if (rowId.startsWith(NEW_ROW_PREFIX)) {
      return removeInsert(current, rowId.slice(NEW_ROW_PREFIX.length));
    }
    return canDelete && isIdentified(rowId) ? toggleDeletion(current, JSON.parse(rowId) as CellValues) : current;
  }, changes);
}
