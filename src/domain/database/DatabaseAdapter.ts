import type { NamespaceSchema } from '../schema/NamespaceSchema';
import type { ParameterizedStatement } from './ParameterizedStatement';
import type { QueryResult } from './QueryResult';
import type { RowBatch } from './RowBatch';
import type { TableRef } from '../schema/TableRef';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  dispose(): Promise<void>;
  onDisconnect(listener: () => void): void;
  listNamespaces(): Promise<string[]>;
  listTables(namespace: string): Promise<TableRef[]>;
  readSchema(namespace: string): Promise<NamespaceSchema>;
  runQuery(sql: string, maxRows: number): Promise<QueryResult>;
  queryPage(statement: ParameterizedStatement): Promise<QueryResult>;
  applyStatements(statements: readonly ParameterizedStatement[]): Promise<number>;
  cancelRunningQuery(): Promise<void>;
  streamRows(statement: ParameterizedStatement, batchSize: number): AsyncIterable<RowBatch>;
  enforceReadOnly(): Promise<void>;
  buildSelectPreview(table: TableRef, limit: number): string;
}
