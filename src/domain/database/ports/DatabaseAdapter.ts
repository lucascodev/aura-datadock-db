import type { NamespaceSchema } from '../../schema/model/NamespaceSchema';
import type { ParameterizedStatement } from '../model/ParameterizedStatement';
import type { QueryResult } from '../model/QueryResult';
import type { RowBatch } from '../model/RowBatch';
import type { TableRef } from '../../schema/model/TableRef';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  dispose(): Promise<void>;
  onDisconnect(listener: () => void): void;
  listDatabases(): Promise<string[]>;
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
