import type { PieChartData } from '../../../../../../application/charts/model/data/ChartData';
import { formatFullNumber } from '../../../formatting/formatFullNumber';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import type { TooltipParam } from '../../../model/TooltipParam';
import { createBaseOption } from '../common/createBaseOption';
import { createLegendOption } from '../common/createLegendOption';
import { createTooltipOption } from '../common/createTooltipOption';
import { RING_WIDTH } from '../constants/seriesSizes';

const MIN_LABELED_SHARE = 5;

export function toPieOption(context: OptionContext, data: PieChartData): EChartsOptionRecord {
  const { palette } = context;
  const names = data.slices.map((slice) => slice.name);
  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);
  const isLabeled = (value: number) => (value / total) * 100 >= MIN_LABELED_SHARE;
  return createBaseOption(context, {
    legend: createLegendOption(context, names),
    tooltip: createTooltipOption(context, 'item', ([param]) => ({
      title: param?.name,
      lines: [{ label: data.valueName, value: `${formatFullNumber(param?.value as number)} (${formatFullNumber(param?.percent ?? 0)}%)`, color: param?.color }],
    })),
    series: [
      {
        type: 'pie',
        name: data.valueName,
        radius: ['0%', '68%'],
        center: ['50%', '54%'],
        data: data.slices.map((slice) => (isLabeled(slice.value) ? slice : { ...slice, label: { show: false }, labelLine: { show: false } })),
        itemStyle: { borderColor: palette.surface, borderWidth: RING_WIDTH },
        label: { color: palette.text, formatter: (param: TooltipParam) => `${param.name} ${formatFullNumber(param.percent ?? 0)}%` },
        labelLine: { lineStyle: { color: palette.baseline } },
      },
    ],
  });
}
