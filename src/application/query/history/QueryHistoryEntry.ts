export interface QueryHistoryEntry {
  readonly sql: string;
  readonly connectionKey: string;
  readonly connectionName: string;
  readonly executedAt: number;
  readonly durationMs: number;
  readonly rowCount?: number;
  readonly errorMessage?: string;
}
