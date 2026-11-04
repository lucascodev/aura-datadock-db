import type { RowChange } from '../../../../application/editing/model/RowChange';
import type { QueryHistoryEntry } from '../../../../application/query/model/QueryHistoryEntry';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../domain/database/ports/DatabaseAdapter';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { ParameterizedStatement } from '../../../../domain/database/model/ParameterizedStatement';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import * as vscode from 'vscode';

export interface TableEditorDependencies {
  readonly extensionUri: vscode.Uri;
  getAdapter(targetId: string): Promise<DatabaseAdapter>;
  loadSchema(target: ConnectionTarget, namespace: string): Promise<NamespaceSchema>;
  isReadOnly(target: ConnectionTarget): boolean;
  confirmsDestructive(): boolean;
  pageSize(): number;
  openSql(target: ConnectionTarget, sql: string): Promise<void>;
  runScript(target: ConnectionTarget, sql: string): Promise<boolean>;
  exportRows(target: ConnectionTarget, table: Pick<TableRef, 'namespace' | 'name'>, statement: ParameterizedStatement): Promise<void>;
  openTable(target: ConnectionTarget, table: Pick<TableRef, 'namespace' | 'name'>): Promise<void>;
  copyText(text: string): PromiseLike<void>;
  recordHistory(entry: QueryHistoryEntry): Promise<void>;
  log(message: string): void;
}

export interface TableEditorOptions {
  readonly restoredChanges?: readonly RowChange[];
  readonly shouldAddRow?: boolean;
}
