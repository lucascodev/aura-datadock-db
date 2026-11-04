export interface BoxplotStats {
  readonly lowerWhisker: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly upperWhisker: number;
  readonly outliers: readonly number[];
  readonly count: number;
}
