import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import { NEW_ROW_PREFIX } from '../constants/rowIdPrefixes';
import { rowKeyOf } from '../display/rowKeyOf';
import { editInsert } from '../pendingInserts/editInsert';
import type { CellPosition } from '../grid/model/CellPosition';
import type { CellValues, RowChange } from '../model/RowChange';
import { editCell } from './editCell';

interface NamedColumn {
  readonly name: string;
}

export function applyCellEdit(
  changes: readonly RowChange[],
  position: CellPosition,
  value: CellValue,
  columns: readonly NamedColumn[],
  primaryKey: readonly string[],
  rows: readonly (readonly CellValue[])[],
): readonly RowChange[] {
  if (position.rowId.startsWith(NEW_ROW_PREFIX)) {
    return editInsert(changes, position.rowId.slice(NEW_ROW_PREFIX.length), position.column, value);
  }
  const key = JSON.parse(position.rowId) as CellValues;
  const row = rows.find((candidate) => JSON.stringify(rowKeyOf(columns, primaryKey, candidate)) === position.rowId);
  const columnIndex = columns.findIndex((column) => column.name === position.column);
  return editCell(changes, key, position.column, value, row?.[columnIndex] ?? null);
}
