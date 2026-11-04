import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { CellValues } from '../model/RowChange';

interface DuplicableColumn {
  readonly name: string;
  readonly isEditable: boolean;
  readonly isPrimaryKey: boolean;
}

export function duplicateRowValues(columns: readonly DuplicableColumn[], row: readonly CellValue[]): CellValues {
  const copied = columns.flatMap((column, index): [string, CellValue][] => (column.isEditable && !column.isPrimaryKey ? [[column.name, row[index]]] : []));
  return Object.fromEntries(copied);
}
