import type { SortState } from '../model/SortState';
import type { ResultRow } from '../model/ResultRow';

export function sortRows(rows: readonly ResultRow[], sort: SortState | undefined, isNumeric: boolean): ResultRow[] {
  if (!sort) {
    return [...rows];
  }
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort((left, right) => compareCells(left[sort.columnIndex], right[sort.columnIndex], isNumeric, sign));
}

function compareCells(left: string | null, right: string | null, isNumeric: boolean, sign: number): number {
  if (left === null || right === null) {
    return left === right ? 0 : left === null ? 1 : -1;
  }
  const order = isNumeric ? Number(left) - Number(right) : left.localeCompare(right, undefined, { numeric: true });
  return order * sign;
}
