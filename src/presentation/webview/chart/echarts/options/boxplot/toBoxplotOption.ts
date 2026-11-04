import type { BoxplotChartData } from '../../../../../../application/charts/model/data/ChartData';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { formatFullNumber } from '../../../formatting/formatFullNumber';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import type { TooltipContent } from '../../../model/TooltipContent';
import type { TooltipParam } from '../../../model/TooltipParam';
import { createAxisOption } from '../common/createAxisOption';
import { createBaseOption } from '../common/createBaseOption';
import { createGridOption } from '../common/createGridOption';
import { createRingStyle } from '../common/createRingStyle';
import { createTooltipOption } from '../common/createTooltipOption';
import { createValueLabels } from '../common/createValueLabels';
import { BAR_MAX_WIDTH, LINE_WIDTH, MARKER_SIZE } from '../constants/seriesSizes';

function boxplotTooltip(data: BoxplotChartData, outliersName: string, [param]: readonly TooltipParam[]): TooltipContent {
  const group = data.groups[param?.seriesName === outliersName ? (param.value as number[])[0] : param?.dataIndex ?? 0];
  if (param?.seriesName === outliersName) {
    return { title: group?.name, lines: [{ label: l10n.t('Outlier'), value: formatFullNumber((param.value as number[])[1]) }] };
  }
  const stats = group?.stats;
  return {
    title: group?.name,
    lines: stats
      ? [
          { label: l10n.t('Upper whisker'), value: formatFullNumber(stats.upperWhisker) },
          { label: l10n.t('Q3'), value: formatFullNumber(stats.q3) },
          { label: l10n.t('Median'), value: formatFullNumber(stats.median) },
          { label: l10n.t('Q1'), value: formatFullNumber(stats.q1) },
          { label: l10n.t('Lower whisker'), value: formatFullNumber(stats.lowerWhisker) },
          { label: l10n.t('Rows'), value: formatFullNumber(stats.count) },
        ]
      : [],
  };
}

function boxplotSeries(context: OptionContext, data: BoxplotChartData, outliersName: string): EChartsOptionRecord[] {
  const color = context.palette.categorical[0];
  const outliers = data.groups.flatMap((group, index) => group.stats.outliers.map((value) => [index, value]));
  return [
    {
      type: 'boxplot',
      name: data.valueName,
      boxWidth: [8, BAR_MAX_WIDTH],
      itemStyle: { color: 'transparent', borderColor: color, borderWidth: LINE_WIDTH },
      data: data.groups.map(({ stats }) => [stats.lowerWhisker, stats.q1, stats.median, stats.q3, stats.upperWhisker]),
    },
    { type: 'scatter', name: outliersName, data: outliers, symbolSize: MARKER_SIZE, itemStyle: { ...createRingStyle(context), color } },
  ];
}

export function toBoxplotOption(context: OptionContext, data: BoxplotChartData): EChartsOptionRecord {
  const outliersName = l10n.t('Outliers');
  return createBaseOption(context, {
    grid: createGridOption(false, false),
    xAxis: createAxisOption(context, 'category', data.groupName ?? '', { data: data.groups.map((group) => group.name) }),
    yAxis: createAxisOption(context, 'value', data.valueName, { scale: true, ...createValueLabels(context, data.groups.flatMap(({ stats }) => [stats.lowerWhisker, stats.upperWhisker, ...stats.outliers])) }),
    tooltip: createTooltipOption(context, 'item', (params) => boxplotTooltip(data, outliersName, params)),
    series: boxplotSeries(context, data, outliersName),
  });
}
