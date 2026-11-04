import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import type { RowChange } from '../../../../../application/editing/model/RowChange';
import type { TableEditability } from '../../../../../application/editing/model/TableEditability';
import type { TableFilter, TablePageRequest, TableSort } from '../../../../../application/editing/model/tableFilters';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import type { CustomResultView, TableColumnView } from '../../../../contracts/TableEditorMessages';
import type { DataViewMode } from '../model/DataViewMode';
import { RowDisplay } from './RowDisplay';
import { RowEditing } from './RowEditing';
import { RowPaging } from './RowPaging';
import { RowSelection } from './RowSelection';
import { TableView } from './TableView';

export class DataTabState {
  columns: readonly TableColumnView[] = [];
  primaryKey: readonly string[] = [];
  editability: TableEditability = { canInsert: false, canUpdate: false, canDelete: false };
  limit = 100;
  rows: readonly (readonly CellValue[])[] = [];
  changes: readonly RowChange[] = [];
  total?: number;
  offset = 0;
  sort?: TableSort;
  filters: readonly TableFilter[] = [];
  whereExpression = '';
  selectedRowIds: ReadonlySet<string> = new Set();
  activeCell?: CellPosition;
  durationMs = 0;
  fetchedAt?: Date;
  isBusy = false;
  mode: DataViewMode = 'grid';
  isValuePanelOpen = true;
  isSqlPanelOpen = false;
  pageSql = '';
  customResult?: CustomResultView;
  readonly view = new TableView(this);
  readonly display = new RowDisplay(this);
  readonly paging = new RowPaging(this);
  readonly selection = new RowSelection(this);
  readonly editing = new RowEditing(this);

  get isCustomResult(): boolean {
    return this.customResult !== undefined;
  }

  get displayColumns(): readonly TableColumnView[] {
    if (!this.customResult) {
      return this.columns;
    }
    return this.customResult.columns.map((name) => ({ name, dataType: '', isNullable: true, isPrimaryKey: false, isForeignKey: false, hasDefault: false, isEditable: false }));
  }

  applyPage(request: TablePageRequest, rows: readonly (readonly CellValue[])[], durationMs: number, sql: string): void {
    this.rows = rows;
    this.offset = request.offset;
    this.durationMs = durationMs;
    this.fetchedAt = new Date();
    this.pageSql = sql;
    this.total = undefined;
    this.selection.clear();
    this.customResult = undefined;
    this.isBusy = false;
    this.selection.ensureActiveCell();
  }

  applyCustomResult(result: CustomResultView): void {
    this.customResult = result;
    this.durationMs = result.durationMs;
    this.fetchedAt = new Date();
    this.selection.clear();
    this.isBusy = false;
    this.activeCell = undefined;
    this.selection.ensureActiveCell();
  }
}
