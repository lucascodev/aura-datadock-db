import { getChartKind } from '../support/getChartKind';
import type { ChartConfig } from '../model/config/ChartConfig';
import type { ChartKind } from '../model/config/ChartKind';
import type { ColumnInfo } from '../model/config/ColumnKind';

function namesOfKind(columns: readonly ColumnInfo[], kind: ColumnInfo['kind']): string[] {
  return columns.filter((column) => column.kind === kind).map((column) => column.name);
}

function chooseX(role: 'any' | 'number' | 'none', previous: string | undefined, columns: readonly ColumnInfo[], numbers: readonly string[]): string | undefined {
  if (role === 'none') {
    return undefined;
  }
  const allowed = role === 'number' ? numbers : columns.map((column) => column.name);
  if (previous && allowed.includes(previous)) {
    return previous;
  }
  const notNumber = columns.find((column) => column.kind !== 'number')?.name;
  return role === 'any' && notNumber ? notNumber : allowed[0];
}

function chooseY(role: 'many' | 'one' | 'none', previous: readonly string[], numbers: readonly string[], x: string | undefined): string[] {
  if (role === 'none') {
    return [];
  }
  const kept = previous.filter((name) => numbers.includes(name) && name !== x);
  const available = kept.length > 0 ? kept : numbers.filter((name) => name !== x);
  const chosen = available.length > 0 ? available : numbers;
  return role === 'many' ? [...chosen] : chosen.slice(0, 1);
}

function chooseGroup(role: 'optional' | 'required' | 'none', previous: string | undefined, columns: readonly ColumnInfo[], x: string | undefined): string | undefined {
  if (role === 'none') {
    return undefined;
  }
  const allowed = columns.map((column) => column.name).filter((name) => name !== x);
  if (previous && allowed.includes(previous)) {
    return previous;
  }
  return role === 'required' ? columns.find((column) => column.kind !== 'number' && column.name !== x)?.name ?? allowed[0] : undefined;
}

export function adaptConfig(kind: ChartKind, previous: ChartConfig, columns: readonly ColumnInfo[]): ChartConfig {
  const definition = getChartKind(kind);
  const numbers = namesOfKind(columns, 'number');
  const x = chooseX(definition.x, previous.x, columns, numbers);
  const group = chooseGroup(definition.group, previous.group, columns, x);
  const y = chooseY(definition.y, previous.y, numbers, x);
  return { kind, x, y: group ? y.slice(0, 1) : y, group, showRegression: previous.showRegression, binCount: previous.binCount };
}
