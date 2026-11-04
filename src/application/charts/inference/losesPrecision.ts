import type { ChartCell } from '../model/config/ChartInput';

const INTEGER_PATTERN = /^[+-]?\d+$/;

export function losesPrecision(cell: ChartCell): boolean {
  if (cell === null) {
    return false;
  }
  const text = cell.trim();
  return INTEGER_PATTERN.test(text) && !Number.isSafeInteger(Number(text));
}
