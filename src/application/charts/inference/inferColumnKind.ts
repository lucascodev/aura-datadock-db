import type { ChartCell } from '../model/config/ChartInput';
import type { ColumnKind } from '../model/config/ColumnKind';
import { parseChartNumber } from './parseChartNumber';
import { parseChartTemporal } from './parseChartTemporal';

export function inferColumnKind(cells: readonly ChartCell[]): ColumnKind {
  const present = cells.filter((cell) => cell !== null);
  if (present.length === 0) {
    return 'category';
  }
  if (present.every((cell) => parseChartNumber(cell) !== undefined)) {
    return 'number';
  }
  return present.every((cell) => parseChartTemporal(cell) !== undefined) ? 'temporal' : 'category';
}
