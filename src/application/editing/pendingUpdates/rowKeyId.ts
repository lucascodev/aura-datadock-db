import type { CellValues } from '../model/RowChange';

export function rowKeyId(key: CellValues): string {
  return JSON.stringify(Object.entries(key).sort(([left], [right]) => left.localeCompare(right)));
}
