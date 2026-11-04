import { quantile } from './quantile';
import type { BoxplotStats } from '../model/statistics/BoxplotStats';
import { LOWER_QUARTILE } from '../constants/quartiles';
import { UPPER_QUARTILE } from '../constants/quartiles';

const MEDIAN = 0.5;
const WHISKER_RANGE = 1.5;

export function computeBoxplot(values: readonly number[]): BoxplotStats | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const q1 = quantile(sorted, LOWER_QUARTILE);
  const q3 = quantile(sorted, UPPER_QUARTILE);
  const margin = (q3 - q1) * WHISKER_RANGE;
  const inside = sorted.filter((value) => value >= q1 - margin && value <= q3 + margin);
  return {
    lowerWhisker: inside[0],
    q1,
    median: quantile(sorted, MEDIAN),
    q3,
    upperWhisker: inside[inside.length - 1],
    outliers: sorted.filter((value) => value < q1 - margin || value > q3 + margin),
    count: sorted.length,
  };
}
