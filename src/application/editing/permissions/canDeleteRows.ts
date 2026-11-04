import { NEW_ROW_PREFIX } from '../constants/rowIdPrefixes';
import type { DisplayRow } from '../grid/model/DisplayRow';

export function canDeleteRows(isCustomResult: boolean, canDelete: boolean, targetRows: readonly string[], findRow: (rowId: string) => DisplayRow | undefined): boolean {
  if (isCustomResult) {
    return false;
  }
  return targetRows.some((rowId) => rowId.startsWith(NEW_ROW_PREFIX) || (canDelete && findRow(rowId)?.isIdentified === true));
}
