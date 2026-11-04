import { losesPrecision } from '../../inference/losesPrecision';
import { parseChartNumber } from '../../inference/parseChartNumber';
import { MAX_CARTESIAN_SERIES } from '../../constants/cartesianLimits';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { ChartInput } from '../../model/config/ChartInput';
import type { CartesianAccumulation } from '../../model/data/CartesianAccumulation';
import type { RowTally } from '../../model/data/RowTally';
import { columnIndex } from '../../support/columns/columnIndex';
import { labelOf } from '../../support/columns/labelOf';
import { foldByWeight } from '../../support/folding/foldByWeight';

type Fold = ReturnType<typeof foldByWeight> | undefined;

interface YContribution {
  readonly originalName: string;
  readonly seriesName: string;
  readonly value: number;
  readonly isApproximate: boolean;
}

interface RowReading {
  readonly label: string;
  readonly contributions: readonly YContribution[];
  readonly isIncomplete: boolean;
}

function groupWeights(input: ChartInput, groupIndex: number, valueIndex: number): Map<string, number> {
  const weights = new Map<string, number>();
  for (const row of input.rows) {
    const name = labelOf(row[groupIndex]);
    weights.set(name, (weights.get(name) ?? 0) + Math.abs(parseChartNumber(row[valueIndex]) ?? 0));
  }
  return weights;
}

function readRow(label: string, row: readonly (string | null)[], yIndexes: readonly number[], yNames: readonly string[], groupIndex: number, fold: Fold): RowReading {
  const contributions: YContribution[] = [];
  let isIncomplete = false;
  for (const [position, yIndex] of yIndexes.entries()) {
    const value = parseChartNumber(row[yIndex]);
    if (value === undefined) {
      isIncomplete = true;
      continue;
    }
    const originalName = fold ? labelOf(row[groupIndex]) : yNames[position];
    const seriesName = fold ? fold.resolve(originalName) : originalName;
    contributions.push({ originalName, seriesName, value, isApproximate: losesPrecision(row[yIndex]) });
  }
  return { label, contributions, isIncomplete };
}

function sumSeries(readings: readonly RowReading[]): { series: Map<string, Map<string, number>>; labels: Set<string>; mergedRows: number } {
  const series = new Map<string, Map<string, number>>();
  const labels = new Set<string>();
  let mergedRows = 0;
  for (const { label, contributions } of readings) {
    let isMerged = false;
    for (const contribution of contributions) {
      const values = series.get(contribution.seriesName) ?? new Map<string, number>();
      series.set(contribution.seriesName, values);
      const previous = values.get(label);
      values.set(label, (previous ?? 0) + contribution.value);
      isMerged = (previous !== undefined && contribution.seriesName === contribution.originalName) || isMerged;
      labels.add(label);
    }
    mergedRows += isMerged ? 1 : 0;
  }
  return { series, labels, mergedRows };
}

function tallyReadings(rowCount: number, readings: readonly RowReading[], mergedRows: number, foldedCount: number): RowTally {
  return {
    unusable: rowCount - readings.length + readings.filter((reading) => reading.isIncomplete).length,
    merged: mergedRows,
    folded: foldedCount,
    isApproximate: readings.some((reading) => reading.contributions.some((contribution) => contribution.isApproximate)),
  };
}

export function accumulateCartesianSeries(input: ChartInput, config: ChartConfig, yNames: readonly string[]): CartesianAccumulation {
  const xIndex = columnIndex(input, config.x);
  const groupIndex = columnIndex(input, config.group);
  const yIndexes = yNames.map((name) => columnIndex(input, name));
  const fold = groupIndex >= 0 ? foldByWeight(groupWeights(input, groupIndex, yIndexes[0]), MAX_CARTESIAN_SERIES) : undefined;
  const readings = input.rows.flatMap((row) => (row[xIndex] === null ? [] : [readRow(row[xIndex], row, yIndexes, yNames, groupIndex, fold)]));
  const { series, labels, mergedRows } = sumSeries(readings);
  return { series, labels, tally: tallyReadings(input.rows.length, readings, mergedRows, fold?.foldedCount ?? 0) };
}
