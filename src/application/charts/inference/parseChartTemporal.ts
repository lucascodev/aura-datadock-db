import type { ChartCell } from '../model/ChartInput';

const TEMPORAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$/;
const MILLISECOND_DIGITS = 3;

export function parseChartTemporal(cell: ChartCell): number | undefined {
  const match = cell === null ? null : TEMPORAL_PATTERN.exec(cell.trim());
  if (!match) {
    return undefined;
  }
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map((part) => Number(part ?? 0));
  const milliseconds = Number((match[7] ?? '').padEnd(MILLISECOND_DIGITS, '0').slice(0, MILLISECOND_DIGITS));
  const time = Date.UTC(year, month - 1, day, hour, minute, second, milliseconds);
  const parsed = new Date(time);
  const isRealDate = parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day && hour < 24 && minute < 60 && second < 60;
  return isRealDate ? time : undefined;
}
