import type { ChartCell } from '../model/ChartInput';

const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;

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

export function losesPrecision(cell: ChartCell): boolean {
  if (cell === null) {
    return false;
  }
  const text = cell.trim();
  return INTEGER_PATTERN.test(text) && !Number.isSafeInteger(Number(text));
}
