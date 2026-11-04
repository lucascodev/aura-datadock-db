import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import { NEW_ROW_PREFIX, UNIDENTIFIED_ROW_PREFIX } from '../constants/rowIdPrefixes';
import type { DisplayRow } from '../grid/model/DisplayRow';
import type { RowChange } from '../model/RowChange';
import { findUpdate } from '../pendingUpdates/findUpdate';
import { isMarkedForDeletion } from '../pendingUpdates/isMarkedForDeletion';
import { rowKeyOf } from './rowKeyOf';

interface NamedColumn {
  readonly name: string;
}

export function buildDisplayRows(
  columns: readonly NamedColumn[],
  primaryKey: readonly string[],
  rows: readonly (readonly CellValue[])[],
  offset: number,
  changes: readonly RowChange[],
): DisplayRow[] {
  return [...displayInserts(columns, changes), ...rows.map((row, index) => toDisplayRow(columns, primaryKey, changes, row, offset + index, index))];
}

function displayInserts(columns: readonly NamedColumn[], changes: readonly RowChange[]): DisplayRow[] {
  return changes.flatMap((change): DisplayRow[] => {
    if (change.type !== 'insert') {
      return [];
    }
    return [{
      rowId: `${NEW_ROW_PREFIX}${change.id}`,
      label: '+',
      isNew: true,
      isDeleted: false,
      isIdentified: true,
      values: columns.map((column) => (column.name in change.values ? change.values[column.name] : undefined)),
      changedColumns: new Set(Object.keys(change.values)),
    }];
  });
}

function toDisplayRow(
  columns: readonly NamedColumn[],
  primaryKey: readonly string[],
  changes: readonly RowChange[],
  row: readonly CellValue[],
  position: number,
  index: number,
): DisplayRow {
  const label = String(position + 1);
  const key = rowKeyOf(columns, primaryKey, row);
  if (!key) {
    return { rowId: `${UNIDENTIFIED_ROW_PREFIX}${index}`, label, isNew: false, isDeleted: false, isIdentified: false, values: row, changedColumns: new Set() };
  }
  const update = findUpdate(changes, key);
  return {
    rowId: JSON.stringify(key),
    label,
    isNew: false,
    isDeleted: isMarkedForDeletion(changes, key),
    isIdentified: true,
    values: columns.map((column, columnIndex) => (update && column.name in update.values ? update.values[column.name] : row[columnIndex])),
    changedColumns: new Set(Object.keys(update?.values ?? {})),
  };
}
