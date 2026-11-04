import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';
import type { ChartKind } from '../../../../../application/charts/model/config/ChartKind';

export interface ChartControlsCallbacks {
  onKindChange(kind: ChartKind): void;
  onConfigChange(config: ChartConfig): void;
  onExport(format: 'png' | 'svg'): void;
}
