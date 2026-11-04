import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import type { TooltipContent } from '../../../model/TooltipContent';
import type { TooltipParam } from '../../../model/TooltipParam';

function asParams(params: unknown): readonly TooltipParam[] {
  return Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam];
}

export function createTooltipOption(context: OptionContext, trigger: 'axis' | 'item', build: (params: readonly TooltipParam[]) => TooltipContent): EChartsOptionRecord {
  const { palette, isExport } = context;
  return {
    show: !isExport,
    trigger,
    confine: true,
    backgroundColor: palette.surface,
    borderColor: palette.baseline,
    borderWidth: 1,
    padding: 8,
    extraCssText: 'box-shadow: none;',
    axisPointer: { type: trigger === 'axis' ? 'line' : 'none', lineStyle: { color: palette.baseline, width: 1 } },
    formatter: (params: unknown) => context.renderTooltip(build(asParams(params))),
  };
}
