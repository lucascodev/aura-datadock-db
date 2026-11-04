import { quantile } from './quantile';
import type { HistogramBin } from './HistogramBin';

const MAX_AUTOMATIC_BINS = 50;
const MAX_BINS = 200;
const LOWER_QUARTILE = 0.25;
const UPPER_QUARTILE = 0.75;

function sturgesBins(count: number): number {
  return Math.ceil(Math.log2(count)) + 1;
}

function automaticBins(sorted: readonly number[]): number {
  const interquartileRange = quantile(sorted, UPPER_QUARTILE) - quantile(sorted, LOWER_QUARTILE);
  const range = sorted[sorted.length - 1] - sorted[0];
  const freedmanDiaconisWidth = (2 * interquartileRange) / Math.cbrt(sorted.length);
  const bins = freedmanDiaconisWidth > 0 ? Math.ceil(range / freedmanDiaconisWidth) : sturgesBins(sorted.length);
  return Math.min(MAX_AUTOMATIC_BINS, Math.max(1, bins));
}

export function computeHistogram(values: readonly number[], requestedBins?: number): HistogramBin[] {
  if (values.length === 0) {
    return [];
  }
  const sorted = [...values].sort((left, right) => left - right);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    return [{ from: min, to: max, count: values.length }];
  }

  const binCount = requestedBins ? Math.min(MAX_BINS, Math.max(1, Math.floor(requestedBins))) : automaticBins(sorted);
  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) {
    counts[Math.min(binCount - 1, Math.floor((value - min) / width))]++;
  }
  return counts.map((count, index) => ({ from: min + width * index, to: index === binCount - 1 ? max : min + width * (index + 1), count }));
}
