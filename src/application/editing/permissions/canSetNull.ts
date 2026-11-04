import type { EditorColumn } from '../grid/model/EditorColumn';

export function canSetNull(column: EditorColumn | undefined, isActiveCellEditable: boolean): boolean {
  return column !== undefined && column.isNullable && isActiveCellEditable;
}
