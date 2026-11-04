import type { CartesianChartData } from '../../../../../../application/charts/model/data/ChartData';
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
import { createZoomOptions } from '../common/createZoomOptions';
import { BAR_MAX_WIDTH, BAR_RADIUS, LEGEND_FROM_SERIES, LINE_WIDTH, MARKER_SIZE } from '../constants/seriesSizes';

const AREA_OPACITY = 0.1;
const MARKERS_UP_TO_POINTS = 40;
const SAMPLE_FROM_POINTS = 2000;

function cartesianSeries(context: OptionContext, data: CartesianChartData): EChartsOptionRecord[] {
  const pointCount = data.categories.length;
  return data.series.map((series) => {
    const values = data.positions ? series.values.map((value, index) => [data.positions?.[index], value]) : series.values;
    if (data.seriesKind === 'bar') {
      return { type: 'bar', name: series.name, data: values, barMaxWidth: BAR_MAX_WIDTH, itemStyle: { borderRadius: BAR_RADIUS } };
    }
    return {
      type: 'line',
      name: series.name,
      data: values,
      connectNulls: false,
      symbol: 'circle',
      showSymbol: pointCount <= MARKERS_UP_TO_POINTS,
      symbolSize: MARKER_SIZE,
      lineStyle: { width: LINE_WIDTH, cap: 'round', join: 'round' },
      itemStyle: createRingStyle(context),
      sampling: pointCount > SAMPLE_FROM_POINTS ? 'lttb' : undefined,
      ...(data.seriesKind === 'area' ? { areaStyle: { opacity: AREA_OPACITY } } : {}),
    };
  });
}

function cartesianValue(value: unknown): unknown {
  return Array.isArray(value) ? value[1] : value;
}

export function toCartesianOption(context: OptionContext, data: CartesianChartData): EChartsOptionRecord {
  const names = data.series.map((series) => series.name);
  const hasLegend = names.length >= LEGEND_FROM_SERIES;
  const dataZoom = createZoomOptions(context, data.categories.length);
  const xExtra = data.axisType === 'category' ? { data: data.categories, boundaryGap: data.seriesKind === 'bar' } : { scale: data.axisType === 'value' };
  return createBaseOption(context, {
    legend: createLegendOption(context, names),
    grid: createGridOption(hasLegend, dataZoom.length > 0),
    dataZoom,
    useUTC: true,
    xAxis: createAxisOption(context, data.axisType, data.xName, data.axisType === 'value' ? { ...xExtra, ...createValueLabels(context, data.positions ?? []) } : xExtra),
    yAxis: createAxisOption(context, 'value', names.length === 1 ? data.yName : '', createValueLabels(context, data.series.flatMap((series) => series.values.filter((value) => value !== null)))),
    tooltip: createTooltipOption(context, 'axis', (params) => ({
      title: data.positions ? data.categories[params[0]?.dataIndex ?? 0] : params[0]?.axisValueLabel,
      lines: params.flatMap((param) => {
        const value = cartesianValue(param.value);
        return typeof value === 'number' ? [{ label: param.seriesName ?? '', value: formatFullNumber(value), color: param.color }] : [];
      }),
    })),
    series: cartesianSeries(context, data),
  });
}
