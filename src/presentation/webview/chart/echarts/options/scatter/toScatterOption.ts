import type { ScatterChartData } from '../../../../../../application/charts/model/data/ChartData';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { formatFullNumber } from '../../../formatting/formatFullNumber';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { createAxisOption } from '../common/createAxisOption';
import { createBaseOption } from '../common/createBaseOption';
import { createGridOption } from '../common/createGridOption';
import { createLegendOption } from '../common/createLegendOption';
import { createRingStyle } from '../common/createRingStyle';
import { createTooltipOption } from '../common/createTooltipOption';
import { createValueLabels } from '../common/createValueLabels';
import { LEGEND_FROM_SERIES, LINE_WIDTH, MARKER_SIZE } from '../constants/seriesSizes';

const LARGE_SCATTER_POINTS = 5000;
const OVERLAP_OPACITY = 0.85;

function scatterSeries(context: OptionContext, data: ScatterChartData): EChartsOptionRecord[] {
  const pointCount = data.series.reduce((sum, series) => sum + series.points.length, 0);
  return data.series.map((series) => ({
    type: 'scatter',
    name: series.name,
    data: series.points,
    symbolSize: MARKER_SIZE,
    large: pointCount > LARGE_SCATTER_POINTS,
    itemStyle: { ...createRingStyle(context), opacity: OVERLAP_OPACITY },
  }));
}

function trendSeries(context: OptionContext, data: ScatterChartData, trendName: string | undefined): EChartsOptionRecord[] {
  if (!data.regression || !trendName) {
    return [];
  }
  const { mutedText } = context.palette;
  return [{ type: 'line', name: trendName, data: [data.regression.from, data.regression.to], symbol: 'none', silent: true, color: mutedText, lineStyle: { width: LINE_WIDTH, color: mutedText } }];
}

export function toScatterOption(context: OptionContext, data: ScatterChartData): EChartsOptionRecord {
  const trendName = data.regression ? l10n.t('Linear fit (R² = {0})', data.regression.rSquared.toFixed(3)) : undefined;
  const names = [...data.series.map((series) => series.name), ...(trendName ? [trendName] : [])];
  return createBaseOption(context, {
    legend: createLegendOption(context, names),
    grid: createGridOption(names.length >= LEGEND_FROM_SERIES, false),
    xAxis: createAxisOption(context, 'value', data.xName, { scale: true, ...createValueLabels(context, data.series.flatMap((series) => series.points.map(([x]) => x))) }),
    yAxis: createAxisOption(context, 'value', data.yName, { scale: true, ...createValueLabels(context, data.series.flatMap((series) => series.points.map(([, y]) => y))) }),
    tooltip: createTooltipOption(context, 'item', ([param]) => {
      const [x, y] = param?.value as [number, number];
      return {
        title: param?.seriesName,
        lines: [
          { label: data.xName, value: formatFullNumber(x) },
          { label: data.yName, value: formatFullNumber(y) },
        ],
      };
    }),
    series: [...scatterSeries(context, data), ...trendSeries(context, data, trendName)],
  });
}
