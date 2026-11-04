import { losesPrecision } from '../../inference/losesPrecision';
import { parseChartNumber } from '../../inference/parseChartNumber';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { EmptyChartData, ScatterChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import type { RowTally } from '../../model/data/RowTally';
import { computeLinearRegression } from '../../statistics/computeLinearRegression';
import { columnIndex } from '../../support/columns/columnIndex';
import { labelOf } from '../../support/columns/labelOf';
import { foldByWeight } from '../../support/folding/foldByWeight';
import { moveOtherLast } from '../../support/folding/moveOtherLast';
import { createTally } from '../../support/tally/createTally';
import { tallyNotices } from '../../support/tally/tallyNotices';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const MAX_SERIES = 3;

type Fold = ReturnType<typeof foldByWeight> | undefined;

interface CollectedPoints {
  readonly series: ReadonlyMap<string, [number, number][]>;
  readonly allPoints: [number, number][];
  readonly tally: RowTally;
}

function countByGroup(input: ChartInput, groupIndex: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of input.rows) {
    const name = labelOf(row[groupIndex]);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

function collectPoints(input: ChartInput, config: ChartConfig, fold: Fold): CollectedPoints {
  const tally = createTally();
  const xIndex = columnIndex(input, config.x);
  const yIndex = columnIndex(input, config.y[0]);
  const groupIndex = columnIndex(input, config.group);
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
  return { series, allPoints, tally };
}

export function buildScatterData(input: ChartInput, config: ChartConfig): ScatterChartData | EmptyChartData {
  const groupIndex = columnIndex(input, config.group);
  const fold = groupIndex >= 0 ? foldByWeight(countByGroup(input, groupIndex), MAX_SERIES) : undefined;
  const { series, allPoints, tally } = collectPoints(input, config, fold);
  if (allPoints.length === 0) {
    return { form: 'empty', reason: l10n.t('No row has two numbers to draw.'), notices: tallyNotices(tally) };
  }

  const regression = config.showRegression ? computeLinearRegression(allPoints) : undefined;
  const regressionNotice = config.showRegression && !regression ? [{ kind: 'regression' as const, message: l10n.t('The trend line needs at least two different X values.') }] : [];
  return {
    form: 'scatter',
    xName: config.x ?? '',
    yName: config.y[0],
    series: moveOtherLast([...series.keys()]).map((name) => ({ name, points: series.get(name) ?? [] })),
    regression,
    notices: [...tallyNotices(tally), ...regressionNotice],
  };
}
