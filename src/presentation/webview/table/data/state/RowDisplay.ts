import { NEW_ROW_PREFIX } from '../../../../../application/editing/constants/rowIdPrefixes';
import { buildCustomDisplayRows } from '../../../../../application/editing/display/buildCustomDisplayRows';
import { buildDisplayRows } from '../../../../../application/editing/display/buildDisplayRows';
import { describeRowCount } from '../../../../../application/editing/display/describeRowCount';
import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import type { DisplayRow } from '../../../../../application/editing/grid/model/DisplayRow';
import { canDeleteRows } from '../../../../../application/editing/permissions/canDeleteRows';
import { canSetNull } from '../../../../../application/editing/permissions/canSetNull';
import { isCellEditable } from '../../../../../application/editing/permissions/isCellEditable';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import type { DataTabState } from './DataTabState';

export class RowDisplay {
  constructor(private readonly state: DataTabState) {}

  rowCountLabel(): string {
    const { customResult, rows, durationMs, fetchedAt } = this.state;
    const fetched = customResult ? customResult.rows.length : rows.length;
    return describeRowCount(fetched, customResult?.isTruncated === true, durationMs, fetchedAt);
  }

  displayRows(): DisplayRow[] {
    const { customResult, columns, primaryKey, rows, offset, changes } = this.state;
    if (customResult) {
      return buildCustomDisplayRows(customResult.rows);
    }
    return buildDisplayRows(columns, primaryKey, rows, offset, changes);
  }

  findDisplayRow(rowId: string): DisplayRow | undefined {
    return this.displayRows().find((row) => row.rowId === rowId);
  }

  cellValue(position: CellPosition): CellValue | undefined {
    const index = this.state.displayColumns.findIndex((column) => column.name === position.column);
    return this.findDisplayRow(position.rowId)?.values[index];
  }

  isCellEditable(position: CellPosition): boolean {
    const column = this.state.columns.find((candidate) => candidate.name === position.column);
    return isCellEditable(this.state.isCustomResult, column, this.findDisplayRow(position.rowId), this.state.editability);
  }

  canSetNull(): boolean {
    const { activeCell } = this.state;
    const column = this.state.columns.find((candidate) => candidate.name === activeCell?.column);
    return activeCell !== undefined && canSetNull(column, this.isCellEditable(activeCell));
  }

  canUseDefault(): boolean {
    return this.state.activeCell?.rowId.startsWith(NEW_ROW_PREFIX) ?? false;
  }

  recordPosition(): { readonly index: number; readonly count: number } {
    const rows = this.displayRows();
    return { index: Math.max(0, rows.findIndex((row) => row.rowId === this.state.activeCell?.rowId)), count: rows.length };
  }

  canDeleteTargets(targetRowIds: readonly string[]): boolean {
    return canDeleteRows(this.state.isCustomResult, this.state.editability.canDelete, targetRowIds, (rowId) => this.findDisplayRow(rowId));
  }
}
