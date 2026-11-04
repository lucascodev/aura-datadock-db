import { losesPrecision, parseChartNumber } from '../inference/parseChartNumber';
import type { ChartConfig } from '../model/ChartConfig';
import type { BoxplotChartData, BoxplotGroup, EmptyChartData } from '../model/ChartData';
import type { ChartInput } from '../model/ChartInput';
import { computeBoxplot } from '../statistics/computeBoxplot';
import { columnIndex, labelOf } from '../support/columnAccess';
import { foldByWeight, otherLabel } from '../support/foldByWeight';
import { createTally, tallyNotices } from '../support/createRowTally';
import { l10n } from '../../../domain/i18n/l10n';

const MAX_GROUPS = 30;

export function buildBoxplotData(input: ChartInput, config: ChartConfig): BoxplotChartData | EmptyChartData {
  const tally = createTally();
  const valueIndex = columnIndex(input, config.y[0]);
  const groupIndex = columnIndex(input, config.group);
  const byGroup = new Map<string, number[]>();

  for (const row of input.rows) {
    const value = parseChartNumber(row[valueIndex]);
    if (value === undefined) {
      tally.unusable++;
      continue;
    }
    tally.isApproximate ||= losesPrecision(row[valueIndex]);
    const name = groupIndex >= 0 ? labelOf(row[groupIndex]) : config.y[0];
    byGroup.set(name, [...(byGroup.get(name) ?? []), value]);
  }
  if (byGroup.size === 0) {
    return { form: 'empty', reason: l10n.t('This column has no numbers to summarize.'), notices: tallyNotices(tally) };
  }

  const fold = foldByWeight(new Map([...byGroup].map(([name, values]) => [name, values.length])), MAX_GROUPS);
  tally.folded = fold.foldedCount;
  const folded = new Map<string, number[]>();
  for (const [name, values] of byGroup) {
    const target = fold.resolve(name);
    folded.set(target, [...(folded.get(target) ?? []), ...values]);
  }
  const names = [...folded.keys()];
  const groups = [...names.filter((name) => name !== otherLabel()), ...names.filter((name) => name === otherLabel())].flatMap((name): BoxplotGroup[] => {
    const stats = computeBoxplot(folded.get(name) ?? []);
    return stats ? [{ name, stats }] : [];
  });
  return { form: 'boxplot', valueName: config.y[0], groupName: config.group, groups, notices: tallyNotices(tally) };
}
