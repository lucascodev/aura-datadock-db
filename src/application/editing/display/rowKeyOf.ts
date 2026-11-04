import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { CellValues } from '../model/RowChange';

export function rowKeyOf(columns: readonly { readonly name: string }[], primaryKey: readonly string[], row: readonly CellValue[]): CellValues | undefined {
  if (primaryKey.length === 0) {
    return undefined;
  }
  return Object.fromEntries(primaryKey.map((name) => [name, row[columns.findIndex((column) => column.name === name)]]));
}
