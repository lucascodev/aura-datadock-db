import { NEW_ROW_PREFIX } from '../../../../../application/editing/constants/rowIdPrefixes';
import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import { addInsert } from '../../../../../application/editing/pendingInserts/addInsert';
import { appendDuplicates } from '../../../../../application/editing/pendingInserts/appendDuplicates';
import { clearInsertValue } from '../../../../../application/editing/pendingInserts/clearInsertValue';
import { applyCellEdit } from '../../../../../application/editing/pendingUpdates/applyCellEdit';
import { applyRowDeletions } from '../../../../../application/editing/pendingUpdates/applyRowDeletions';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import type { DataTabState } from './DataTabState';

export class RowEditing {
  private nextInsertNumber = 1;

  constructor(private readonly state: DataTabState) {}

  commitCell(position: CellPosition, value: CellValue): void {
    if (this.state.display.isCellEditable(position)) {
      this.state.changes = applyCellEdit(this.state.changes, position, value, this.state.columns, this.state.primaryKey, this.state.rows);
    }
  }

  setActiveNull(): void {
    if (this.state.activeCell && this.state.display.canSetNull()) {
      this.commitCell(this.state.activeCell, null);
    }
  }

  useDefaultForActive(): void {
    const { activeCell } = this.state;
    if (activeCell && this.state.display.canUseDefault()) {
      this.state.changes = clearInsertValue(this.state.changes, activeCell.rowId.slice(NEW_ROW_PREFIX.length), activeCell.column);
    }
  }

  addRow(): void {
    const { columns } = this.state;
    const id = this.createInsertId();
    this.state.changes = addInsert(this.state.changes, id);
    const firstToFill = columns.find((column) => column.isEditable && !column.hasDefault) ?? columns.find((column) => column.isEditable);
    this.state.activeCell = firstToFill ? { rowId: `${NEW_ROW_PREFIX}${id}`, column: firstToFill.name } : undefined;
  }

  canDuplicate(): boolean {
    return !this.state.customResult && this.state.editability.canInsert && this.state.selection.targetRowIds().length > 0;
  }

  duplicateTargetRows(): void {
    if (!this.canDuplicate()) {
      return;
    }
    const rows = this.state.selection.targetRowIds().flatMap((rowId) => {
      const row = this.state.display.findDisplayRow(rowId);
      return row ? [row] : [];
    });
    this.state.changes = appendDuplicates(this.state.changes, rows, this.state.columns, () => this.createInsertId());
    this.state.selectedRowIds = new Set();
  }

  canDelete(): boolean {
    return this.state.display.canDeleteTargets(this.state.selection.targetRowIds());
  }

  deleteTargetRows(): void {
    if (!this.canDelete()) {
      return;
    }
    const isIdentified = (rowId: string) => this.state.display.findDisplayRow(rowId)?.isIdentified === true;
    this.state.changes = applyRowDeletions(this.state.changes, this.state.selection.targetRowIds(), this.state.editability.canDelete, isIdentified);
    this.state.selectedRowIds = new Set();
    this.state.selection.ensureActiveCell();
  }

  discardChanges(): void {
    this.state.changes = [];
    this.state.selection.ensureActiveCell();
  }

  applySaved(): void {
    this.state.changes = [];
  }

  private createInsertId(): string {
    return `row-${Date.now()}-${this.nextInsertNumber++}`;
  }
}
