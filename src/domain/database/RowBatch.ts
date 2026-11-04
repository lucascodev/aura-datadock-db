export interface RowBatch {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
}
