export type SortDirection = 'ascending' | 'descending';

export interface SortState {
  readonly columnIndex: number;
  readonly direction: SortDirection;
}

export type ResultRow = readonly (string | null)[];

export function filterRows(rows: readonly ResultRow[], filter: string): ResultRow[] {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return [...rows];
  }
  return rows.filter((row) => row.some((cell) => cell?.toLowerCase().includes(needle)));
}

export function sortRows(rows: readonly ResultRow[], sort: SortState | undefined, isNumeric: boolean): ResultRow[] {
  if (!sort) {
    return [...rows];
  }
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort((left, right) => compareCells(left[sort.columnIndex], right[sort.columnIndex], isNumeric, sign));
}

export function nextSort(current: SortState | undefined, columnIndex: number): SortState | undefined {
  if (current?.columnIndex !== columnIndex) {
    return { columnIndex, direction: 'ascending' };
  }
  return current.direction === 'ascending' ? { columnIndex, direction: 'descending' } : undefined;
}

function compareCells(left: string | null, right: string | null, isNumeric: boolean, sign: number): number {
  if (left === null || right === null) {
    return left === right ? 0 : left === null ? 1 : -1;
  }
  const order = isNumeric ? Number(left) - Number(right) : left.localeCompare(right, undefined, { numeric: true });
  return order * sign;
}
