import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';

export function createBaseOption(context: OptionContext, extra: EChartsOptionRecord): EChartsOptionRecord {
  const { palette, isExport } = context;
  return {
    animation: false,
    backgroundColor: isExport ? palette.surface : 'transparent',
    color: palette.categorical,
    textStyle: { color: palette.text, fontFamily: palette.fontFamily },
    ...extra,
  };
}
