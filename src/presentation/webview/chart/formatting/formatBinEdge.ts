import { getFormatter } from './getFormatter';
import { MAX_FRACTION_DIGITS } from '../constants/maxFractionDigits';

export function formatBinEdge(value: number, binWidth: number): string {
  const fractionDigits = binWidth >= 1 || binWidth === 0 ? 0 : Math.min(MAX_FRACTION_DIGITS, Math.ceil(-Math.log10(binWidth)));
  return getFormatter({ maximumFractionDigits: fractionDigits }).format(value);
}
