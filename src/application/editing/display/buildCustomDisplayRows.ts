import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import { UNIDENTIFIED_ROW_PREFIX } from '../constants/rowIdPrefixes';
import type { DisplayRow } from '../grid/model/DisplayRow';

export function buildCustomDisplayRows(rows: readonly (readonly CellValue[])[]): DisplayRow[] {
  return rows.map((row, index) => ({
    rowId: `${UNIDENTIFIED_ROW_PREFIX}${index}`,
    label: String(index + 1),
    isNew: false,
    isDeleted: false,
    isIdentified: false,
    values: row,
    changedColumns: new Set<string>(),
  }));
}
