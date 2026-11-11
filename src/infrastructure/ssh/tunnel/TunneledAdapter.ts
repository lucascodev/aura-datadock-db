import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { QueryResult } from '../../../domain/database/model/QueryResult';
import type { RowBatch } from '../../../domain/database/model/RowBatch';
import type { TableRef } from '../../../domain/schema/model/TableRef';
import type { SshTunnel } from '../model/SshTunnel';

export class TunneledAdapter implements DatabaseAdapter {
  constructor(
    private readonly inner: DatabaseAdapter,
    private readonly tunnel: SshTunnel,
  ) {}

  connect(): Promise<void> {
    return this.inner.connect();
  }

  async dispose(): Promise<void> {
    try {
      await this.inner.dispose();
    } finally {
      await this.tunnel.close();
    }
  }

  onDisconnect(listener: () => void): void {
    this.inner.onDisconnect(listener);
    this.tunnel.onClose(listener);
  }

  listDatabases(): Promise<string[]> {
    return this.inner.listDatabases();
  }

  listNamespaces(): Promise<string[]> {
    return this.inner.listNamespaces();
  }

  listTables(namespace: string): Promise<TableRef[]> {
    return this.inner.listTables(namespace);
  }

  readSchema(namespace: string): Promise<NamespaceSchema> {
    return this.inner.readSchema(namespace);
  }

  runQuery(sql: string, maxRows: number): Promise<QueryResult> {
    return this.inner.runQuery(sql, maxRows);
  }

  queryPage(statement: ParameterizedStatement): Promise<QueryResult> {
    return this.inner.queryPage(statement);
  }

  applyStatements(statements: readonly ParameterizedStatement[]): Promise<number> {
    return this.inner.applyStatements(statements);
  }

  cancelRunningQuery(): Promise<void> {
    return this.inner.cancelRunningQuery();
  }

  streamRows(statement: ParameterizedStatement, batchSize: number): AsyncIterable<RowBatch> {
    return this.inner.streamRows(statement, batchSize);
  }

  enforceReadOnly(): Promise<void> {
    return this.inner.enforceReadOnly();
  }

  buildSelectPreview(table: TableRef, limit: number): string {
    return this.inner.buildSelectPreview(table, limit);
  }
}
