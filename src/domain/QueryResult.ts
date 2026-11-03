export interface QueryResult {
  readonly columns: readonly string[];
  readonly rows: readonly Record<string, unknown>[];
  readonly affectedRows?: number;
  readonly truncated: boolean;
  readonly durationMs: number;
}
