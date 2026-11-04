import type { ColumnKind } from '../model/config/ColumnKind';
import { parseChartNumber } from '../inference/parseChartNumber';
import { parseChartTemporal } from '../inference/parseChartTemporal';

export function axisPosition(kind: ColumnKind, label: string): number | undefined {
  if (kind === 'number') {
    return parseChartNumber(label);
  }
  return kind === 'temporal' ? parseChartTemporal(label) : undefined;
}

export function orderLabels(kind: ColumnKind, labels: readonly string[]): string[] {
  if (kind === 'category') {
    return [...labels];
  }
  return [...labels].sort((left, right) => (axisPosition(kind, left) ?? 0) - (axisPosition(kind, right) ?? 0));
}
