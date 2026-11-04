import { losesPrecision, parseChartNumber } from '../inference/parseChartNumber';
import type { ChartConfig } from '../model/ChartConfig';
import type { EmptyChartData, ScatterChartData } from '../model/ChartData';
import type { ChartInput } from '../model/ChartInput';
import { computeLinearRegression } from '../statistics/computeLinearRegression';
import { columnIndex, labelOf } from '../support/columnAccess';
import { foldByWeight, otherLabel } from '../support/foldByWeight';
import { createTally, tallyNotices } from '../support/createRowTally';
import { l10n } from '../../../domain/i18n/translation/l10n';

const MAX_SERIES = 3;

function countByGroup(input: ChartInput, groupIndex: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of input.rows) {
    const name = labelOf(row[groupIndex]);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

export function buildScatterData(input: ChartInput, config: ChartConfig): ScatterChartData | EmptyChartData {
  const tally = createTally();
  const xIndex = columnIndex(input, config.x);
  const yIndex = columnIndex(input, config.y[0]);
  const groupIndex = columnIndex(input, config.group);
  const fold = groupIndex >= 0 ? foldByWeight(countByGroup(input, groupIndex), MAX_SERIES) : undefined;
  const series = new Map<string, [number, number][]>();
  const allPoints: [number, number][] = [];
  tally.folded = fold?.foldedCount ?? 0;

  for (const row of input.rows) {
    const x = parseChartNumber(row[xIndex]);
    const y = parseChartNumber(row[yIndex]);
    if (x === undefined || y === undefined) {
      tally.unusable++;
      continue;
    }
    tally.isApproximate ||= losesPrecision(row[xIndex]) || losesPrecision(row[yIndex]);
    const name = fold ? fold.resolve(labelOf(row[groupIndex])) : config.y[0];
    const points = series.get(name) ?? [];
    series.set(name, points);
    points.push([x, y]);
    allPoints.push([x, y]);
  }
  if (allPoints.length === 0) {
    return { form: 'empty', reason: l10n.t('No row has two numbers to draw.'), notices: tallyNotices(tally) };
  }

  const regression = config.showRegression ? computeLinearRegression(allPoints) : undefined;
  const regressionNotice = config.showRegression && !regression ? [{ kind: 'regression' as const, message: l10n.t('The trend line needs at least two different X values.') }] : [];
  const names = [...series.keys()];
  return {
    form: 'scatter',
    xName: config.x ?? '',
    yName: config.y[0],
    series: [...names.filter((name) => name !== otherLabel()), ...names.filter((name) => name === otherLabel())].map((name) => ({ name, points: series.get(name) ?? [] })),
    regression,
    notices: [...tallyNotices(tally), ...regressionNotice],
  };
}
