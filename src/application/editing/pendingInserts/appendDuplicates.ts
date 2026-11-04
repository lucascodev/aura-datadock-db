import type { DisplayRow } from '../grid/model/DisplayRow';
import type { EditorColumn } from '../grid/model/EditorColumn';
import type { CellValues, RowChange } from '../model/RowChange';
import { duplicateRowValues } from '../rows/duplicateRowValues';

export function appendDuplicates(changes: readonly RowChange[], rows: readonly DisplayRow[], columns: readonly EditorColumn[], createId: () => string): readonly RowChange[] {
  const duplicates = rows.map((row): RowChange => ({ type: 'insert', id: createId(), values: duplicatedValues(columns, row) }));
  return [...changes, ...duplicates];
}

function duplicatedValues(columns: readonly EditorColumn[], row: DisplayRow): CellValues {
  const copied = duplicateRowValues(columns, row.values.map((value) => value ?? null));
  const defaulted = columns.filter((_, position) => row.values[position] === undefined).map((column) => column.name);
  return Object.fromEntries(Object.entries(copied).filter(([name]) => !defaulted.includes(name)));
}
