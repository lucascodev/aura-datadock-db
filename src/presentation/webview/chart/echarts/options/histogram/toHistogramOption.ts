import type { HistogramChartData } from '../../../../../../application/charts/model/data/ChartData';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { formatBinEdge } from '../../../formatting/formatBinEdge';
import { formatFullNumber } from '../../../formatting/formatFullNumber';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { createAxisOption } from '../common/createAxisOption';
import { createBaseOption } from '../common/createBaseOption';
import { createGridOption } from '../common/createGridOption';
import { createTooltipOption } from '../common/createTooltipOption';
import { createValueLabels } from '../common/createValueLabels';
import { BAR_RADIUS } from '../constants/seriesSizes';

function binLabel(from: number, to: number): string {
  const width = to - from;
  return from === to ? formatFullNumber(from) : `${formatBinEdge(from, width)} – ${formatBinEdge(to, width)}`;
}

export function toHistogramOption(context: OptionContext, data: HistogramChartData): EChartsOptionRecord {
  return createBaseOption(context, {
    grid: createGridOption(false, false),
    xAxis: createAxisOption(context, 'category', data.valueName, { data: data.bins.map((bin) => binLabel(bin.from, bin.to)) }),
    yAxis: createAxisOption(context, 'value', l10n.t('Rows'), createValueLabels(context, data.bins.map((bin) => bin.count))),
    tooltip: createTooltipOption(context, 'axis', ([param]) => ({
      title: param?.axisValueLabel,
      lines: [{ label: l10n.t('Rows'), value: formatFullNumber(param?.value as number), color: param?.color }],
    })),
    series: [{ type: 'bar', name: l10n.t('Rows'), data: data.bins.map((bin) => bin.count), barCategoryGap: '4%', itemStyle: { borderRadius: BAR_RADIUS } }],
  });
}
