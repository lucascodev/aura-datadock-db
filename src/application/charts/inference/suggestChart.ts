import type { ChartConfig } from '../model/config/ChartConfig';
import type { ColumnInfo, ColumnKind } from '../model/config/ColumnKind';

const SINGLE_VALUE = 1;

function namesOf(columns: readonly ColumnInfo[], kind: ColumnKind): string[] {
  return columns.filter((column) => column.kind === kind).map((column) => column.name);
}

export function suggestChart(columns: readonly ColumnInfo[], rowCount: number): ChartConfig | undefined {
  const base = { showRegression: false };
  if (rowCount === 0) {
    return undefined;
  }
  if (rowCount === SINGLE_VALUE) {
    return columns.length === SINGLE_VALUE ? { ...base, kind: 'stat', y: [] } : undefined;
  }

  const numbers = namesOf(columns, 'number');
  const temporals = namesOf(columns, 'temporal');
  const categories = namesOf(columns, 'category');
  if (numbers.length === 0) {
    return undefined;
  }
  if (temporals.length > 0) {
    return categories.length > 0
      ? { ...base, kind: 'line', x: temporals[0], y: [numbers[0]], group: categories[0] }
      : { ...base, kind: 'line', x: temporals[0], y: numbers };
  }
  if (categories.length >= 2) {
    return { ...base, kind: 'heatmap', x: categories[0], y: [numbers[0]], group: categories[1] };
  }
  if (categories.length === 1) {
    return { ...base, kind: 'bar', x: categories[0], y: numbers };
  }
  return numbers.length >= 2 ? { ...base, kind: 'scatter', x: numbers[0], y: [numbers[1]] } : { ...base, kind: 'histogram', y: [numbers[0]] };
}
