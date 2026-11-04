import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { LEGEND_FROM_SERIES } from '../constants/seriesSizes';

export function createLegendOption(context: OptionContext, names: readonly string[]): EChartsOptionRecord {
  const { palette } = context;
  return {
    show: names.length >= LEGEND_FROM_SERIES,
    top: 0,
    type: 'scroll',
    data: names,
    textStyle: { color: palette.text },
    pageTextStyle: { color: palette.mutedText },
    pageIconColor: palette.text,
    pageIconInactiveColor: palette.baseline,
  };
}
