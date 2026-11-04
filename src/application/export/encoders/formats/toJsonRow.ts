import { toExportValue } from '../values/toExportValue';

export function toJsonRow(columnNames: readonly string[], row: readonly unknown[]): Record<string, unknown> {
  return Object.fromEntries(columnNames.map((name, index) => [name, toExportValue(row[index]) ?? null]));
}
