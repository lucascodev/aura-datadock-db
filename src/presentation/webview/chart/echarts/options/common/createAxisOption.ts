import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';

export function createAxisOption(context: OptionContext, type: string, name: string, extra: EChartsOptionRecord = {}): EChartsOptionRecord {
  const { palette } = context;
  return {
    type,
    name,
    nameLocation: 'middle',
    nameGap: type === 'category' || type === 'time' ? 28 : 44,
    nameTextStyle: { color: palette.mutedText },
    axisLine: { show: true, lineStyle: { color: palette.baseline, width: 1 } },
    axisTick: { show: false },
    axisLabel: { color: palette.mutedText, hideOverlap: true },
    splitLine: { show: type === 'value', lineStyle: { color: palette.grid, width: 1, type: 'solid' } },
    ...extra,
  };
}
