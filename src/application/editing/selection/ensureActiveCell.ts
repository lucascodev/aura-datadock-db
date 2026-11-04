import type { CellPosition } from '../grid/model/CellPosition';
import type { DisplayRow } from '../grid/model/DisplayRow';

export function ensureActiveCell(rows: readonly DisplayRow[], columnNames: readonly string[], active: CellPosition | undefined): CellPosition | undefined {
  if (rows.length === 0 || columnNames.length === 0) {
    return undefined;
  }
  const hasActiveRow = rows.some((row) => row.rowId === active?.rowId);
  const hasActiveColumn = columnNames.some((name) => name === active?.column);
  if (active && hasActiveRow && hasActiveColumn) {
    return active;
  }
  return {
    rowId: hasActiveRow && active ? active.rowId : rows[0].rowId,
    column: hasActiveColumn && active ? active.column : columnNames[0],
  };
}
