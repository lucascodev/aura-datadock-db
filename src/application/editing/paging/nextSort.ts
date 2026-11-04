import type { TableSort } from '../model/tableFilters';

export function nextSort(current: TableSort | undefined, column: string): TableSort | undefined {
  if (current?.column !== column) {
    return { column, isDescending: false };
  }
  return current.isDescending ? undefined : { column, isDescending: true };
}
