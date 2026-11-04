import type { ChartKind } from './ChartKind';

export interface ChartConfig {
  readonly kind: ChartKind;
  readonly x?: string;
  readonly y: readonly string[];
  readonly group?: string;
  readonly showRegression: boolean;
  readonly binCount?: number;
}
