import type { RowSelectionGesture } from '../grid/model/RowSelectionGesture';

export function selectRows(
  selectedRowIds: ReadonlySet<string>,
  anchor: string | undefined,
  orderedRowIds: readonly string[],
  rowId: string,
  gesture: RowSelectionGesture,
): { readonly selectedRowIds: ReadonlySet<string>; readonly anchor: string | undefined } {
  if (gesture.isRange && anchor) {
    return { selectedRowIds: new Set(rowIdsBetween(orderedRowIds, anchor, rowId)), anchor };
  }
  if (!gesture.isToggle) {
    return { selectedRowIds: new Set([rowId]), anchor: rowId };
  }
  const next = new Set(selectedRowIds);
  if (!next.delete(rowId)) {
    next.add(rowId);
  }
  return { selectedRowIds: next, anchor: rowId };
}

function rowIdsBetween(ids: readonly string[], from: string, to: string): string[] {
  const [start, end] = [ids.indexOf(from), ids.indexOf(to)].sort((a, b) => a - b);
  return start < 0 ? [to] : ids.slice(start, end + 1);
}
