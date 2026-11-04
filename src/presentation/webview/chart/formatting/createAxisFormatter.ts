import { fullFormat } from './fullFormat';
import { getFormatter } from './getFormatter';

const COMPACT_THRESHOLD = 10_000;

function compactFormat(): Intl.NumberFormat {
  return getFormatter({ notation: 'compact', maximumFractionDigits: 1 });
}

export function createAxisFormatter(values: readonly number[]): (value: number) => string {
  const largest = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const format = largest >= COMPACT_THRESHOLD ? compactFormat() : fullFormat();
  return (value) => format.format(value);
}
