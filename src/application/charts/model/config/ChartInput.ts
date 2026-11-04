export type ChartCell = string | null;

export interface ChartInput {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly ChartCell[])[];
  readonly isTruncated: boolean;
}
