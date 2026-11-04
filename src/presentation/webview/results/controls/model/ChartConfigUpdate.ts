import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';

export type ChartConfigUpdate = (change: Partial<ChartConfig>) => void;
