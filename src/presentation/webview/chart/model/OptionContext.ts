import type { ChartPalette } from './ChartPalette';
import type { TooltipContent } from './TooltipContent';

export interface OptionContext {
  readonly palette: ChartPalette;
  readonly isExport: boolean;
  renderTooltip(content: TooltipContent): unknown;
}
