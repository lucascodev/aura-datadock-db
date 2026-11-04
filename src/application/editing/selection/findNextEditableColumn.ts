import type { EditorColumn } from '../grid/model/EditorColumn';

export function findNextEditableColumn(columns: readonly EditorColumn[], currentColumn: string, isEditable: (column: string) => boolean): string | undefined {
  const start = columns.findIndex((column) => column.name === currentColumn);
  return columns.slice(start + 1).find((column) => isEditable(column.name))?.name;
}
