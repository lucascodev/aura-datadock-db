import type { ChartInput } from '../model/config/ChartInput';
import type { ColumnInfo } from '../model/config/ColumnKind';
import { inferColumnKind } from './inferColumnKind';

export function describeColumns(input: ChartInput): ColumnInfo[] {
  return input.columns.map((name, index) => ({ name, kind: inferColumnKind(input.rows.map((row) => row[index])) }));
}
