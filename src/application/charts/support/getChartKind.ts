import type { ChartKind } from '../model/config/ChartKind';
import type { ChartKindDefinition } from '../model/config/ChartKindDefinition';
import { CHART_KINDS } from '../constants/chartKinds';

export function getChartKind(id: ChartKind): ChartKindDefinition {
  return CHART_KINDS.find((kind) => kind.id === id) as ChartKindDefinition;
}
