import type { HeatmapChartData } from '../../../../../../application/charts/model/data/ChartData';
import { formatAxisNumber } from '../../../formatting/formatAxisNumber';
import { formatFullNumber } from '../../../formatting/formatFullNumber';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { createAxisOption } from '../common/createAxisOption';
import { createBaseOption } from '../common/createBaseOption';
import { createTooltipOption } from '../common/createTooltipOption';
import { DEFAULT_LEFT_MARGIN, RING_WIDTH } from '../constants/seriesSizes';

function heatmapVisualMap(context: OptionContext, data: HeatmapChartData): EChartsOptionRecord {
  const { palette } = context;
  return {
    min: data.min,
    max: data.max === data.min ? data.min + 1 : data.max,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: 4,
    itemHeight: 160,
    itemWidth: 12,
    formatter: (value: number) => formatAxisNumber(value),
    text: [data.valueName, ''],
    textStyle: { color: palette.mutedText },
    inRange: { color: palette.sequential },
  };
}

export function toHeatmapOption(context: OptionContext, data: HeatmapChartData): EChartsOptionRecord {
  const { palette } = context;
  return createBaseOption(context, {
    grid: { left: DEFAULT_LEFT_MARGIN, right: 24, top: 16, bottom: 76, containLabel: true },
    xAxis: createAxisOption(context, 'category', data.xName, { data: data.xCategories, splitArea: { show: false } }),
    yAxis: createAxisOption(context, 'category', data.yName, { data: data.yCategories, nameGap: 56, splitArea: { show: false } }),
    visualMap: heatmapVisualMap(context, data),
    tooltip: createTooltipOption(context, 'item', ([param]) => {
      const [xIndex, yIndex, value] = param?.value as [number, number, number];
      return {
        title: `${data.xCategories[xIndex]} · ${data.yCategories[yIndex]}`,
        lines: [{ label: data.valueName, value: formatFullNumber(value) }],
      };
    }),
    series: [{ type: 'heatmap', name: data.valueName, data: data.cells, itemStyle: { borderColor: palette.surface, borderWidth: RING_WIDTH } }],
  });
}
