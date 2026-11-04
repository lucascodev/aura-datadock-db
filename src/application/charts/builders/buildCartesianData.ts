import { losesPrecision, parseChartNumber } from '../inference/parseChartNumber';
import type { ChartConfig } from '../model/ChartConfig';
import type { CartesianAxisType, CartesianChartData, CartesianSeriesKind, EmptyChartData } from '../model/ChartData';
import type { ChartInput } from '../model/ChartInput';
import type { ColumnKind } from '../model/ColumnKind';
import { columnIndex, labelOf } from '../support/columnAccess';
import { axisPosition, orderLabels } from '../support/compareAxisValues';
import { foldByWeight, otherLabel } from '../support/foldByWeight';
import { createTally, tallyNotices } from '../support/createRowTally';
import type { RowTally } from '../support/RowTally';
import { l10n } from '../../../domain/i18n/l10n';

const MAX_SERIES = 8;

type SeriesValues = Map<string, number>;

function axisTypeFor(seriesKind: CartesianSeriesKind, xKind: ColumnKind): CartesianAxisType {
  if (seriesKind === 'bar' || xKind === 'category') {
    return 'category';
  }
  return xKind === 'temporal' ? 'time' : 'value';
}

function groupWeights(input: ChartInput, groupIndex: number, valueIndex: number): Map<string, number> {
  const weights = new Map<string, number>();
  for (const row of input.rows) {
    const name = labelOf(row[groupIndex]);
    weights.set(name, (weights.get(name) ?? 0) + Math.abs(parseChartNumber(row[valueIndex]) ?? 0));
  }
  return weights;
}

function addValue(series: Map<string, SeriesValues>, seriesName: string, label: string, value: number): boolean {
  const values = series.get(seriesName) ?? new Map<string, number>();
  series.set(seriesName, values);
  const previous = values.get(label);
  values.set(label, (previous ?? 0) + value);
  return previous !== undefined;
}

function orderSeries(series: ReadonlyMap<string, SeriesValues>): string[] {
  const names = [...series.keys()];
  return [...names.filter((name) => name !== otherLabel()), ...names.filter((name) => name === otherLabel())];
}

function accumulate(input: ChartInput, config: ChartConfig, yNames: readonly string[], tally: RowTally) {
  const xIndex = columnIndex(input, config.x);
  const groupIndex = columnIndex(input, config.group);
  const yIndexes = yNames.map((name) => columnIndex(input, name));
  const fold = groupIndex >= 0 ? foldByWeight(groupWeights(input, groupIndex, yIndexes[0]), MAX_SERIES) : undefined;
  const series = new Map<string, SeriesValues>();
  const labels = new Set<string>();
  tally.folded = fold?.foldedCount ?? 0;

  for (const row of input.rows) {
    const label = row[xIndex];
    if (label === null) {
      tally.unusable++;
      continue;
    }
    let isIncomplete = false;
    let isMerged = false;
    yIndexes.forEach((yIndex, position) => {
      const value = parseChartNumber(row[yIndex]);
      if (value === undefined) {
        isIncomplete = true;
        return;
      }
      tally.isApproximate ||= losesPrecision(row[yIndex]);
      const originalName = fold ? labelOf(row[groupIndex]) : yNames[position];
      const seriesName = fold ? fold.resolve(originalName) : originalName;
      const hasOverlap = addValue(series, seriesName, label, value);
      isMerged = (hasOverlap && seriesName === originalName) || isMerged;
      labels.add(label);
    });
    tally.unusable += isIncomplete ? 1 : 0;
    tally.merged += isMerged ? 1 : 0;
  }
  return { series, labels };
}

export function buildCartesianData(input: ChartInput, config: ChartConfig, seriesKind: CartesianSeriesKind, xKind: ColumnKind): CartesianChartData | EmptyChartData {
  const tally = createTally();
  const allY = config.group ? config.y.slice(0, 1) : config.y;
  const yNames = allY.slice(0, MAX_SERIES);
  const { series, labels } = accumulate(input, config, yNames, tally);
  if (labels.size === 0) {
    return { form: 'empty', reason: l10n.t('No row has values that can be drawn with these columns.'), notices: tallyNotices(tally) };
  }

  const categories = orderLabels(xKind, [...labels]);
  const axisType = axisTypeFor(seriesKind, xKind);
  const omittedY = allY.length - yNames.length;
  const omittedNotice = omittedY > 0 ? [{ kind: 'folded' as const, message: l10n.t('Only the first {0} numeric columns are drawn; {1} left out.', MAX_SERIES, omittedY) }] : [];
  return {
    form: 'cartesian',
    seriesKind,
    axisType,
    xName: config.x ?? '',
    yName: yNames.join(', '),
    categories,
    positions: axisType === 'category' ? undefined : categories.map((label) => axisPosition(xKind, label) ?? 0),
    series: orderSeries(series).map((name) => ({ name, values: categories.map((label) => series.get(name)?.get(label) ?? null) })),
    notices: [...tallyNotices(tally), ...omittedNotice],
  };
}
