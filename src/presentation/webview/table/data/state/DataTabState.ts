import type { TableEditability } from '../../../../../application/editing/rows/TableEditability';
import { duplicateRowValues } from '../../../../../application/editing/rows/duplicateRow';
import { addInsert, clearInsertValue, editCell, editInsert, findUpdate, isMarkedForDeletion, removeInsert, toggleDeletion } from '../../../../../application/editing/rows/pendingChanges';
import type { CellValues, RowChange } from '../../../../../application/editing/rows/RowChange';
import type { TableFilter, TablePageRequest, TableRowSelection, TableSort } from '../../../../../application/editing/browsing/tableFilters';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import type { CustomResultView, TableColumnView } from '../../../../contracts/TableEditorMessages';
import type { DataViewMode } from '../model/DataViewMode';
import type { CellPosition } from '../model/CellPosition';
import type { DisplayRow } from '../model/DisplayRow';
import type { RowSelectionGesture } from '../model/RowSelectionGesture';

const NEW_ROW_PREFIX = 'new:';
const UNIDENTIFIED_ROW_PREFIX = 'row:';
const MIN_LIMIT = 1;
const MAX_LIMIT = 5000;

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
  private readonly columnWidths = new Map<string, number>();
  private selectionAnchor?: string;
  private nextInsertNumber = 1;

  get isCustomResult(): boolean {
    return this.customResult !== undefined;
  }

  get displayColumns(): readonly TableColumnView[] {
    if (!this.customResult) {
      return this.columns;
    }
    return this.customResult.columns.map((name) => ({ name, dataType: '', isNullable: true, isPrimaryKey: false, isForeignKey: false, hasDefault: false, isEditable: false }));
  }

  request(offset = this.offset): TablePageRequest {
    return { offset, limit: this.limit, ...this.selection() };
  }

  selection(): TableRowSelection {
    return { sort: this.sort, filters: this.filters, whereExpression: this.whereExpression || undefined };
  }

  setWidth(column: string, width: number): void {
    this.columnWidths.set(column, width);
  }

  getWidth(column: string): number | undefined {
    return this.columnWidths.get(column);
  }

  setLimit(limit: number): void {
    if (Number.isSafeInteger(limit)) {
      this.limit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, limit));
    }
  }

  applyPage(request: TablePageRequest, rows: readonly (readonly CellValue[])[], durationMs: number, sql: string): void {
    this.rows = rows;
    this.offset = request.offset;
    this.durationMs = durationMs;
    this.fetchedAt = new Date();
    this.pageSql = sql;
    this.total = undefined;
    this.selectedRowIds = new Set();
    this.selectionAnchor = undefined;
    this.customResult = undefined;
    this.isBusy = false;
    this.ensureActiveCell();
  }

  applyCustomResult(result: CustomResultView): void {
    this.customResult = result;
    this.durationMs = result.durationMs;
    this.fetchedAt = new Date();
    this.selectedRowIds = new Set();
    this.selectionAnchor = undefined;
    this.isBusy = false;
    this.activeCell = undefined;
    this.ensureActiveCell();
  }

  rowCountLabel(): string {
    const fetched = this.customResult ? this.customResult.rows.length : this.rows.length;
    const isTruncated = this.customResult?.isTruncated === true;
    const seconds = (this.durationMs / 1000).toLocaleString(l10n.locale(), { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false });
    if (!this.fetchedAt) {
      return isTruncated
        ? l10n.t('{0} row(s) fetched, more available - {1}s', fetched, seconds)
        : l10n.t('{0} row(s) fetched - {1}s', fetched, seconds);
    }
    const fetchedAt = formatFetchedAt(this.fetchedAt);
    return isTruncated
      ? l10n.t('{0} row(s) fetched, more available - {1}s, on {2}', fetched, seconds, fetchedAt)
      : l10n.t('{0} row(s) fetched - {1}s, on {2}', fetched, seconds, fetchedAt);
  }

  displayRows(): DisplayRow[] {
    if (this.customResult) {
      return this.customResult.rows.map((row, index) => ({
        rowId: `${UNIDENTIFIED_ROW_PREFIX}${index}`,
        label: String(index + 1),
        isNew: false,
        isDeleted: false,
        isIdentified: false,
        values: row,
        changedColumns: new Set<string>(),
      }));
    }
    return [...this.displayInserts(), ...this.rows.map((row, index) => this.toDisplayRow(row, index))];
  }

  private displayInserts(): DisplayRow[] {
    return this.changes.flatMap((change): DisplayRow[] => {
      if (change.type !== 'insert') {
        return [];
      }
      return [{
        rowId: `${NEW_ROW_PREFIX}${change.id}`,
        label: '+',
        isNew: true,
        isDeleted: false,
        isIdentified: true,
        values: this.columns.map((column) => (column.name in change.values ? change.values[column.name] : undefined)),
        changedColumns: new Set(Object.keys(change.values)),
      }];
    });
  }

  private toDisplayRow(row: readonly CellValue[], index: number): DisplayRow {
    const label = String(this.offset + index + 1);
    const key = this.keyOf(row);
    if (!key) {
      return { rowId: `${UNIDENTIFIED_ROW_PREFIX}${index}`, label, isNew: false, isDeleted: false, isIdentified: false, values: row, changedColumns: new Set() };
    }
    const update = findUpdate(this.changes, key);
    return {
      rowId: JSON.stringify(key),
      label,
      isNew: false,
      isDeleted: isMarkedForDeletion(this.changes, key),
      isIdentified: true,
      values: this.columns.map((column, position) => (update && column.name in update.values ? update.values[column.name] : row[position])),
      changedColumns: new Set(Object.keys(update?.values ?? {})),
    };
  }

  private keyOf(row: readonly CellValue[]): CellValues | undefined {
    if (this.primaryKey.length === 0) {
      return undefined;
    }
    return Object.fromEntries(this.primaryKey.map((name) => [name, row[this.columns.findIndex((column) => column.name === name)]]));
  }

  findDisplayRow(rowId: string): DisplayRow | undefined {
    return this.displayRows().find((row) => row.rowId === rowId);
  }

  cellValue(position: CellPosition): CellValue | undefined {
    const index = this.displayColumns.findIndex((column) => column.name === position.column);
    return this.findDisplayRow(position.rowId)?.values[index];
  }

  isCellEditable(position: CellPosition): boolean {
    if (this.customResult) {
      return false;
    }
    const column = this.columns.find((candidate) => candidate.name === position.column);
    const row = this.findDisplayRow(position.rowId);
    if (!column?.isEditable || !row || row.isDeleted) {
      return false;
    }
    return row.isNew || (this.editability.canUpdate && row.isIdentified);
  }

  canSetNull(): boolean {
    const column = this.columns.find((candidate) => candidate.name === this.activeCell?.column);
    return this.activeCell !== undefined && column !== undefined && column.isNullable && this.isCellEditable(this.activeCell);
  }

  canUseDefault(): boolean {
    return this.activeCell?.rowId.startsWith(NEW_ROW_PREFIX) ?? false;
  }

  selectCell(position: CellPosition): void {
    this.activeCell = position;
  }

  moveActive(columnDelta: number, rowDelta: number): void {
    const rows = this.displayRows();
    const columns = this.displayColumns;
    if (rows.length === 0 || columns.length === 0) {
      return;
    }
    const rowIndex = Math.max(0, rows.findIndex((row) => row.rowId === this.activeCell?.rowId));
    const columnIndex = Math.max(0, columns.findIndex((column) => column.name === this.activeCell?.column));
    this.activeCell = {
      rowId: rows[clamp(rowIndex + rowDelta, rows.length)].rowId,
      column: columns[clamp(columnIndex + columnDelta, columns.length)].name,
    };
  }

  nextEditableCell(position: CellPosition): CellPosition | undefined {
    const start = this.columns.findIndex((column) => column.name === position.column);
    const next = this.columns.slice(start + 1).find((column) => this.isCellEditable({ rowId: position.rowId, column: column.name }));
    return next ? { rowId: position.rowId, column: next.name } : undefined;
  }

  selectRow(rowId: string, gesture: RowSelectionGesture): void {
    if (gesture.isRange && this.selectionAnchor) {
      this.selectedRowIds = new Set(this.rowIdsBetween(this.selectionAnchor, rowId));
      return;
    }
    if (gesture.isToggle) {
      const next = new Set(this.selectedRowIds);
      if (!next.delete(rowId)) {
        next.add(rowId);
      }
      this.selectedRowIds = next;
    } else {
      this.selectedRowIds = new Set([rowId]);
    }
    this.selectionAnchor = rowId;
  }

  private rowIdsBetween(from: string, to: string): string[] {
    const ids = this.displayRows().map((row) => row.rowId);
    const [start, end] = [ids.indexOf(from), ids.indexOf(to)].sort((a, b) => a - b);
    return start < 0 ? [to] : ids.slice(start, end + 1);
  }

  commitCell(position: CellPosition, value: CellValue): void {
    if (!this.isCellEditable(position)) {
      return;
    }
    if (position.rowId.startsWith(NEW_ROW_PREFIX)) {
      this.changes = editInsert(this.changes, position.rowId.slice(NEW_ROW_PREFIX.length), position.column, value);
      return;
    }
    const key = JSON.parse(position.rowId) as CellValues;
    const row = this.rows.find((candidate) => JSON.stringify(this.keyOf(candidate)) === position.rowId);
    const columnIndex = this.columns.findIndex((column) => column.name === position.column);
    this.changes = editCell(this.changes, key, position.column, value, row?.[columnIndex] ?? null);
  }

  setActiveNull(): void {
    if (this.activeCell && this.canSetNull()) {
      this.commitCell(this.activeCell, null);
    }
  }

  useDefaultForActive(): void {
    if (this.activeCell && this.canUseDefault()) {
      this.changes = clearInsertValue(this.changes, this.activeCell.rowId.slice(NEW_ROW_PREFIX.length), this.activeCell.column);
    }
  }

  addRow(): void {
    const id = this.createInsertId();
    this.changes = addInsert(this.changes, id);
    const firstToFill = this.columns.find((column) => column.isEditable && !column.hasDefault) ?? this.columns.find((column) => column.isEditable);
    this.activeCell = firstToFill ? { rowId: `${NEW_ROW_PREFIX}${id}`, column: firstToFill.name } : undefined;
  }

  canDuplicate(): boolean {
    return !this.customResult && this.editability.canInsert && this.targetRowIds().length > 0;
  }

  duplicateTargetRows(): void {
    if (!this.canDuplicate()) {
      return;
    }
    for (const rowId of this.targetRowIds()) {
      const row = this.findDisplayRow(rowId);
      if (row) {
        const id = this.createInsertId();
        this.changes = [...this.changes, { type: 'insert', id, values: this.duplicatedValues(row) }];
      }
    }
    this.selectedRowIds = new Set();
  }

  private duplicatedValues(row: DisplayRow): CellValues {
    const copied = duplicateRowValues(this.columns, row.values.map((value) => value ?? null));
    const defaulted = this.columns.filter((_, position) => row.values[position] === undefined).map((column) => column.name);
    return Object.fromEntries(Object.entries(copied).filter(([name]) => !defaulted.includes(name)));
  }

  canDelete(): boolean {
    if (this.customResult) {
      return false;
    }
    return this.targetRowIds().some((rowId) => rowId.startsWith(NEW_ROW_PREFIX) || (this.editability.canDelete && this.findDisplayRow(rowId)?.isIdentified === true));
  }

  deleteTargetRows(): void {
    if (!this.canDelete()) {
      return;
    }
    for (const rowId of this.targetRowIds()) {
      if (rowId.startsWith(NEW_ROW_PREFIX)) {
        this.changes = removeInsert(this.changes, rowId.slice(NEW_ROW_PREFIX.length));
      } else if (this.editability.canDelete && this.findDisplayRow(rowId)?.isIdentified) {
        this.changes = toggleDeletion(this.changes, JSON.parse(rowId) as CellValues);
      }
    }
    this.selectedRowIds = new Set();
    this.ensureActiveCell();
  }

  private targetRowIds(): string[] {
    if (this.selectedRowIds.size > 0) {
      return [...this.selectedRowIds];
    }
    return this.activeCell ? [this.activeCell.rowId] : [];
  }

  discardChanges(): void {
    this.changes = [];
    this.ensureActiveCell();
  }

  applySaved(): void {
    this.changes = [];
  }

  addFilter(filter: TableFilter): void {
    this.filters = [...this.filters, filter];
  }

  removeFilter(index: number): void {
    this.filters = this.filters.filter((_, position) => position !== index);
  }

  setSort(column: string, isDescending: boolean | undefined): void {
    this.sort = isDescending === undefined ? undefined : { column, isDescending };
  }

  cycleSort(column: string): void {
    if (this.sort?.column !== column) {
      this.setSort(column, false);
      return;
    }
    this.setSort(column, this.sort.isDescending ? undefined : true);
  }

  canGoNext(): boolean {
    if (this.customResult || this.isBusy) {
      return false;
    }
    return this.total === undefined ? this.rows.length === this.limit : this.offset + this.rows.length < this.total;
  }

  canGoPrevious(): boolean {
    return !this.customResult && !this.isBusy && this.offset > 0;
  }

  canGoLast(): boolean {
    return this.total !== undefined && this.canGoNext();
  }

  lastOffset(): number {
    return this.total === undefined || this.total === 0 ? 0 : Math.floor((this.total - 1) / this.limit) * this.limit;
  }

  moveRecord(delta: number): void {
    this.moveActive(0, delta);
  }

  recordPosition(): { readonly index: number; readonly count: number } {
    const rows = this.displayRows();
    return { index: Math.max(0, rows.findIndex((row) => row.rowId === this.activeCell?.rowId)), count: rows.length };
  }

  private ensureActiveCell(): void {
    const rows = this.displayRows();
    const columns = this.displayColumns;
    const hasActiveRow = rows.some((row) => row.rowId === this.activeCell?.rowId);
    const hasActiveColumn = columns.some((column) => column.name === this.activeCell?.column);
    if (rows.length === 0 || columns.length === 0) {
      this.activeCell = undefined;
    } else if (!hasActiveRow || !hasActiveColumn) {
      this.activeCell = { rowId: hasActiveRow && this.activeCell ? this.activeCell.rowId : rows[0].rowId, column: hasActiveColumn && this.activeCell ? this.activeCell.column : columns[0].name };
    }
  }

  private createInsertId(): string {
    return `row-${Date.now()}-${this.nextInsertNumber++}`;
  }
}

function formatFetchedAt(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return l10n.t('{0} at {1}', day, `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
}

function clamp(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}
