import { losesPrecision, parseChartNumber } from '../inference/parseChartNumber';
import type { ChartConfig } from '../model/config/ChartConfig';
import type { EmptyChartData, PieChartData } from '../model/data/ChartData';
import type { ChartInput } from '../model/config/ChartInput';
import { columnIndex, labelOf } from '../support/columnAccess';
import { foldByWeight, otherLabel } from '../support/foldByWeight';
import { createTally, tallyNotices } from '../support/createRowTally';
import { l10n } from '../../../domain/i18n/translation/l10n';

const MAX_SLICES = 6;

export function buildPieData(input: ChartInput, config: ChartConfig): PieChartData | EmptyChartData {
  const tally = createTally();
  const nameIndex = columnIndex(input, config.x);
  const valueIndex = columnIndex(input, config.y[0]);
  const totals = new Map<string, number>();

  for (const row of input.rows) {
    const value = parseChartNumber(row[valueIndex]);
    if (value === undefined || value <= 0) {
      tally.unusable++;
      continue;
    }
    tally.isApproximate ||= losesPrecision(row[valueIndex]);
    const name = labelOf(row[nameIndex]);
    tally.merged += totals.has(name) ? 1 : 0;
    totals.set(name, (totals.get(name) ?? 0) + value);
  }
  if (totals.size === 0) {
    return { form: 'empty', reason: l10n.t('A pie chart needs values greater than zero.'), notices: tallyNotices(tally) };
  }

  const fold = foldByWeight(totals, MAX_SLICES, MAX_SLICES);
  tally.folded = fold.foldedCount;
  const slices = new Map<string, number>();
  for (const [name, value] of totals) {
    const slice = fold.resolve(name);
    slices.set(slice, (slices.get(slice) ?? 0) + value);
  }
  const ranked = [...slices.entries()].filter(([name]) => name !== otherLabel()).sort(([, left], [, right]) => right - left);
  const other = slices.get(otherLabel());
  return {
    form: 'pie',
    valueName: config.y[0],
    slices: [...ranked, ...(other === undefined ? [] : [[otherLabel(), other] as const])].map(([name, value]) => ({ name, value })),
    notices: tallyNotices(tally),
  };
}
