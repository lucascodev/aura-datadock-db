import type { CellPosition } from '../grid/model/CellPosition';

export function resolveTargetRowIds(selectedRowIds: ReadonlySet<string>, active: CellPosition | undefined): string[] {
  if (selectedRowIds.size > 0) {
    return [...selectedRowIds];
  }
  return active ? [active.rowId] : [];
}
