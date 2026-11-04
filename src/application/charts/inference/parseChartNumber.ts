import type { ChartCell } from '../model/config/ChartInput';

const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

export function parseChartNumber(cell: ChartCell): number | undefined {
  if (cell === null) {
    return undefined;
  }
  const text = cell.trim();
  if (!NUMBER_PATTERN.test(text)) {
    return undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}
