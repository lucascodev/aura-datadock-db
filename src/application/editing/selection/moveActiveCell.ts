import type { CellPosition } from '../grid/model/CellPosition';
import type { DisplayRow } from '../grid/model/DisplayRow';

export function moveActiveCell(
  rows: readonly DisplayRow[],
  columnNames: readonly string[],
  active: CellPosition | undefined,
  columnDelta: number,
  rowDelta: number,
): CellPosition | undefined {
  if (rows.length === 0 || columnNames.length === 0) {
    return active;
  }
  const rowIndex = Math.max(0, rows.findIndex((row) => row.rowId === active?.rowId));
  const columnIndex = Math.max(0, columnNames.findIndex((name) => name === active?.column));
  return {
    rowId: rows[clamp(rowIndex + rowDelta, rows.length)].rowId,
    column: columnNames[clamp(columnIndex + columnDelta, columnNames.length)],
  };
}

function clamp(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}
