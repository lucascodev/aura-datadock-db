import type { DisplayRow } from '../grid/model/DisplayRow';
import type { EditorColumn } from '../grid/model/EditorColumn';
import type { TableEditability } from '../model/TableEditability';

export function isCellEditable(isCustomResult: boolean, column: EditorColumn | undefined, row: DisplayRow | undefined, editability: TableEditability): boolean {
  if (isCustomResult) {
    return false;
  }
  if (!column?.isEditable || !row || row.isDeleted) {
    return false;
  }
  return row.isNew || (editability.canUpdate && row.isIdentified);
}
