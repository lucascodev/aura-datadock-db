import { losesPrecision } from '../../inference/losesPrecision';
import { parseChartNumber } from '../../inference/parseChartNumber';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { EmptyChartData, PieChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import type { RowTally } from '../../model/data/RowTally';
import { columnIndex } from '../../support/columns/columnIndex';
import { labelOf } from '../../support/columns/labelOf';
import { foldByWeight } from '../../support/folding/foldByWeight';
import { otherLabel } from '../../support/folding/otherLabel';
import { createTally } from '../../support/tally/createTally';
import { tallyNotices } from '../../support/tally/tallyNotices';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const MAX_SLICES = 6;

interface SliceTotals {
  readonly totals: ReadonlyMap<string, number>;
  readonly tally: RowTally;
}

function readTotals(input: ChartInput, config: ChartConfig): SliceTotals {
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
  return { totals, tally };
}

function foldSlices(totals: ReadonlyMap<string, number>): { slices: Map<string, number>; foldedCount: number } {
  const fold = foldByWeight(totals, MAX_SLICES, MAX_SLICES);
  const slices = new Map<string, number>();
  for (const [name, value] of totals) {
    const slice = fold.resolve(name);
    slices.set(slice, (slices.get(slice) ?? 0) + value);
  }
  return { slices, foldedCount: fold.foldedCount };
}

export function buildPieData(input: ChartInput, config: ChartConfig): PieChartData | EmptyChartData {
  const { totals, tally } = readTotals(input, config);
  if (totals.size === 0) {
    return { form: 'empty', reason: l10n.t('A pie chart needs values greater than zero.'), notices: tallyNotices(tally) };
  }

  const { slices, foldedCount } = foldSlices(totals);
  const ranked = [...slices.entries()].filter(([name]) => name !== otherLabel()).sort(([, left], [, right]) => right - left);
  const other = slices.get(otherLabel());
  return {
    form: 'pie',
    valueName: config.y[0],
    slices: [...ranked, ...(other === undefined ? [] : [[otherLabel(), other] as const])].map(([name, value]) => ({ name, value })),
    notices: tallyNotices({ ...tally, folded: foldedCount }),
  };
}
