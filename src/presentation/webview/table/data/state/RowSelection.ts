import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import type { RowSelectionGesture } from '../../../../../application/editing/grid/model/RowSelectionGesture';
import { ensureActiveCell } from '../../../../../application/editing/selection/ensureActiveCell';
import { findNextEditableColumn } from '../../../../../application/editing/selection/findNextEditableColumn';
import { moveActiveCell } from '../../../../../application/editing/selection/moveActiveCell';
import { resolveTargetRowIds } from '../../../../../application/editing/selection/resolveTargetRowIds';
import { selectRows } from '../../../../../application/editing/selection/selectRows';
import type { DataTabState } from './DataTabState';

export class RowSelection {
  private anchor?: string;

  constructor(private readonly state: DataTabState) {}

  selectCell(position: CellPosition): void {
    this.state.activeCell = position;
  }

  moveActive(columnDelta: number, rowDelta: number): void {
    this.state.activeCell = moveActiveCell(this.state.display.displayRows(), this.columnNames(), this.state.activeCell, columnDelta, rowDelta);
  }

  moveRecord(delta: number): void {
    this.moveActive(0, delta);
  }

  nextEditableCell(position: CellPosition): CellPosition | undefined {
    const column = findNextEditableColumn(this.state.columns, position.column, (name) => this.state.display.isCellEditable({ rowId: position.rowId, column: name }));
    return column === undefined ? undefined : { rowId: position.rowId, column };
  }

  selectRow(rowId: string, gesture: RowSelectionGesture): void {
    const orderedRowIds = this.state.display.displayRows().map((row) => row.rowId);
    const selection = selectRows(this.state.selectedRowIds, this.anchor, orderedRowIds, rowId, gesture);
    this.state.selectedRowIds = selection.selectedRowIds;
    this.anchor = selection.anchor;
  }

  clear(): void {
    this.state.selectedRowIds = new Set();
    this.anchor = undefined;
  }

  targetRowIds(): string[] {
    return resolveTargetRowIds(this.state.selectedRowIds, this.state.activeCell);
  }

  ensureActiveCell(): void {
    this.state.activeCell = ensureActiveCell(this.state.display.displayRows(), this.columnNames(), this.state.activeCell);
  }

  private columnNames(): string[] {
    return this.state.displayColumns.map((column) => column.name);
  }
}
