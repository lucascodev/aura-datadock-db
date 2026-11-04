export interface QueryResult {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
  readonly affectedRows?: number;
  readonly truncated: boolean;
  readonly durationMs: number;
}
