import type { TableFilter, TablePageRequest, TableRowSelection } from '../../../../../application/editing/model/tableFilters';
import { clampLimit } from '../../../../../application/editing/paging/clampLimit';
import { nextSort } from '../../../../../application/editing/paging/nextSort';
import type { DataTabState } from './DataTabState';

export class TableView {
  private readonly columnWidths = new Map<string, number>();

  constructor(private readonly state: DataTabState) {}

  request(offset = this.state.offset): TablePageRequest {
    return { offset, limit: this.state.limit, ...this.selection() };
  }

  selection(): TableRowSelection {
    return { sort: this.state.sort, filters: this.state.filters, whereExpression: this.state.whereExpression || undefined };
  }

  setWidth(column: string, width: number): void {
    this.columnWidths.set(column, width);
  }

  getWidth(column: string): number | undefined {
    return this.columnWidths.get(column);
  }

  setLimit(limit: number): void {
    this.state.limit = clampLimit(limit) ?? this.state.limit;
  }

  addFilter(filter: TableFilter): void {
    this.state.filters = [...this.state.filters, filter];
  }

  removeFilter(index: number): void {
    this.state.filters = this.state.filters.filter((_, position) => position !== index);
  }

  setSort(column: string, isDescending: boolean | undefined): void {
    this.state.sort = isDescending === undefined ? undefined : { column, isDescending };
  }

  cycleSort(column: string): void {
    this.state.sort = nextSort(this.state.sort, column);
  }
}
