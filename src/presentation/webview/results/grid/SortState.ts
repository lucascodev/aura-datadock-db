export type SortDirection = 'ascending' | 'descending';

export interface SortState {
  readonly columnIndex: number;
  readonly direction: SortDirection;
}
