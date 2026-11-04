import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';
import type { ColumnInfo } from '../../../../../application/charts/model/config/ColumnKind';

export interface ChartControlsState {
  readonly config: ChartConfig;
  readonly columns: readonly ColumnInfo[];
  readonly canUseStat: boolean;
  readonly canExport: boolean;
}
