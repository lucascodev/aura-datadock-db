import { losesPrecision } from '../inference/losesPrecision';
import { parseChartNumber } from '../inference/parseChartNumber';
import type { ChartConfig } from '../model/config/ChartConfig';
import type { EmptyChartData, HeatmapChartData } from '../model/data/ChartData';
import type { ChartInput } from '../model/config/ChartInput';
import type { ColumnKind } from '../model/config/ColumnKind';
import { columnIndex } from '../support/columns/columnIndex';
import { labelOf } from '../support/columns/labelOf';
import { orderLabels } from '../support/axis/orderLabels';
import { createTally } from '../support/tally/createTally';
import { tallyNotices } from '../support/tally/tallyNotices';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function buildHeatmapData(input: ChartInput, config: ChartConfig, xKind: ColumnKind, yKind: ColumnKind): HeatmapChartData | EmptyChartData {
  const tally = createTally();
  const xIndex = columnIndex(input, config.x);
  const yIndex = columnIndex(input, config.group);
  const valueIndex = columnIndex(input, config.y[0]);
  if (yIndex < 0) {
    return { form: 'empty', reason: l10n.t('Choose a column for the Y axis.'), notices: [] };
  }

  const totals = new Map<string, Map<string, number>>();
  const yLabels = new Set<string>();
  for (const row of input.rows) {
    const value = parseChartNumber(row[valueIndex]);
    if (value === undefined) {
      tally.unusable++;
      continue;
    }
    tally.isApproximate ||= losesPrecision(row[valueIndex]);
    const xLabel = labelOf(row[xIndex]);
    const yLabel = labelOf(row[yIndex]);
    const column = totals.get(xLabel) ?? new Map<string, number>();
    totals.set(xLabel, column);
    tally.merged += column.has(yLabel) ? 1 : 0;
    column.set(yLabel, (column.get(yLabel) ?? 0) + value);
    yLabels.add(yLabel);
  }
  if (totals.size === 0) {
    return { form: 'empty', reason: l10n.t('This column has no numbers to color.'), notices: tallyNotices(tally) };
  }

  const xCategories = orderLabels(xKind, [...totals.keys()]);
  const yCategories = orderLabels(yKind, [...yLabels]);
  const cells = xCategories.flatMap((xLabel, xPosition) =>
    yCategories.flatMap((yLabel, yPosition): [number, number, number][] => {
      const value = totals.get(xLabel)?.get(yLabel);
      return value === undefined ? [] : [[xPosition, yPosition, value]];
    }),
  );
  const values = cells.map(([, , value]) => value);
  return {
    form: 'heatmap',
    xName: config.x ?? '',
    yName: config.group ?? '',
    valueName: config.y[0],
    xCategories,
    yCategories,
    cells,
    min: Math.min(...values),
    max: Math.max(...values),
    notices: tallyNotices(tally),
  };
}
