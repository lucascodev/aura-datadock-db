import type { QueryResult } from '../../../domain/database/QueryResult';

export type StatementOutcome =
  | { readonly status: 'success'; readonly sql: string; readonly result: QueryResult }
  | { readonly status: 'failure'; readonly sql: string; readonly message: string };
