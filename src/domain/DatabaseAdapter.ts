import type { QueryResult } from './QueryResult';
import type { TableColumn } from './TableColumn';
import type { TableRef } from './TableRef';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  dispose(): Promise<void>;
  listNamespaces(): Promise<string[]>;
  listTables(namespace: string): Promise<TableRef[]>;
  listColumns(table: TableRef): Promise<TableColumn[]>;
  runQuery(sql: string, maxRows: number): Promise<QueryResult>;
  enforceReadOnly(): Promise<void>;
  buildSelectPreview(table: TableRef, limit: number): string;
}
