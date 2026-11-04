import { losesPrecision } from '../../inference/losesPrecision';
import { parseChartNumber } from '../../inference/parseChartNumber';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { EmptyChartData, HistogramChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import { computeHistogram } from '../../statistics/computeHistogram';
import { columnIndex } from '../../support/columns/columnIndex';
import { createTally } from '../../support/tally/createTally';
import { tallyNotices } from '../../support/tally/tallyNotices';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export function buildHistogramData(input: ChartInput, config: ChartConfig): HistogramChartData | EmptyChartData {
  const tally = createTally();
  const index = columnIndex(input, config.y[0]);
  const values: number[] = [];
  for (const row of input.rows) {
    const value = parseChartNumber(row[index]);
    if (value === undefined) {
      tally.unusable++;
    } else {
      tally.isApproximate ||= losesPrecision(row[index]);
      values.push(value);
    }
  }
  if (values.length === 0) {
    return { form: 'empty', reason: l10n.t('This column has no numbers to count.'), notices: tallyNotices(tally) };
  }
  return { form: 'histogram', valueName: config.y[0], bins: computeHistogram(values, config.binCount), notices: tallyNotices(tally) };
}
