import type { SortState } from '../model/SortState';

export function nextSort(current: SortState | undefined, columnIndex: number): SortState | undefined {
  if (current?.columnIndex !== columnIndex) {
    return { columnIndex, direction: 'ascending' };
  }
  return current.direction === 'ascending' ? { columnIndex, direction: 'descending' } : undefined;
}
