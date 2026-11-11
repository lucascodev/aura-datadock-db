import { Client, types, type ClientConfig, type CustomTypesConfig, type FieldDef } from 'pg';
import Cursor from 'pg-cursor';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../domain/database/ports/DatabaseAdapter';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import { type CellValue, type ParameterizedStatement } from '../../../../domain/database/model/ParameterizedStatement';
import { assertExpectedRows } from '../../../../domain/database/rules/assertExpectedRows';
import type { QueryResult } from '../../../../domain/database/model/QueryResult';
import type { RowBatch } from '../../../../domain/database/model/RowBatch';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { BACKEND_PID_SQL, CANCEL_BACKEND_SQL, LIST_COLUMNS_SQL, LIST_CONSTRAINTS_SQL, LIST_DATABASES_SQL, LIST_INDEXES_SQL, LIST_NAMESPACES_SQL, LIST_TABLES_SQL } from '../constants/postgresCatalogQueries';
import type { PostgresColumnRow, PostgresConstraintRow, PostgresIndexRow, PostgresTableRow } from '../model/postgresSchemaRows';
import { toPostgresSsl } from './toPostgresSsl';
import { isViewRelation } from './isViewRelation';
import { toPostgresSchema } from './toPostgresSchema';
import { CONNECT_TIMEOUT_MS } from '../../constants/connectTimeout';

const APPLICATION_NAME = 'Aura DataDock DB';
const READ_ONLY_SESSION_SQL = 'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY';
const READ_ONLY_TRANSACTION_SQL = 'BEGIN TRANSACTION READ ONLY';
const ROLLBACK_SQL = 'ROLLBACK';
const RAW_TEXT_TYPE_IDS = new Set<number>([types.builtins.DATE, types.builtins.TIMESTAMP, types.builtins.TIMESTAMPTZ]);

const SINGLE_STATEMENT_PROTOCOL = { queryMode: 'extended' };

const rawDateTypes: CustomTypesConfig = {
  getTypeParser: ((id: number, format?: 'text' | 'binary') =>
    RAW_TEXT_TYPE_IDS.has(id) ? (value: string) => value : types.getTypeParser(id, format as 'text')) as CustomTypesConfig['getTypeParser'],
};

const rawTextTypes: CustomTypesConfig = {
  getTypeParser: (() => (value: string) => value) as CustomTypesConfig['getTypeParser'],
};

export class PostgresAdapter implements DatabaseAdapter {
  private readonly clientConfig: ClientConfig;
  private readonly client: Client;
  private backendPid?: number;
  private runningQueries = 0;
  private isSessionReadOnly = false;
  private readOnlyQueue: Promise<unknown> = Promise.resolve();
  private disconnectListener?: () => void;

  constructor(target: ConnectionTarget) {
    this.clientConfig = {
      host: target.host,
      port: target.port,
      user: target.user,
      password: target.password,
      database: target.database,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      application_name: APPLICATION_NAME,
      types: rawDateTypes,
      ssl: toPostgresSsl(target.tls),
      keepAlive: true,
    };
    this.client = new Client(this.clientConfig);
    this.client.on('error', () => this.disconnectListener?.());
    this.client.on('end', () => this.disconnectListener?.());
  }

  onDisconnect(listener: () => void): void {
    this.disconnectListener = listener;
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const result = await this.client.query<{ pid: number }>(BACKEND_PID_SQL);
    this.backendPid = result.rows[0].pid;
  }

  async dispose(): Promise<void> {
    await this.client.end();
  }

  async listDatabases(): Promise<string[]> {
    const result = await this.client.query<{ database_name: string }>(LIST_DATABASES_SQL);
    return result.rows.map((row) => row.database_name);
  }

  async listNamespaces(): Promise<string[]> {
    const result = await this.client.query<{ schema_name: string }>(LIST_NAMESPACES_SQL);
    return result.rows.map((row) => row.schema_name);
  }

  async listTables(namespace: string): Promise<TableRef[]> {
    const result = await this.client.query<PostgresTableRow>(LIST_TABLES_SQL, [namespace]);
    return result.rows.map((row) => ({
      namespace,
      name: row.table_name,
      kind: isViewRelation(row.relation_kind) ? 'view' : 'table',
    }));
  }

  async readSchema(namespace: string): Promise<NamespaceSchema> {
    const tables = await this.client.query<PostgresTableRow>(LIST_TABLES_SQL, [namespace]);
    const columns = await this.client.query<PostgresColumnRow>(LIST_COLUMNS_SQL, [namespace]);
    const constraints = await this.client.query<PostgresConstraintRow>(LIST_CONSTRAINTS_SQL, [namespace]);
    const indexes = await this.client.query<PostgresIndexRow>(LIST_INDEXES_SQL, [namespace]);

    return toPostgresSchema(namespace, {
      tables: tables.rows,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
    });
  }

  runQuery(sql: string, maxRows: number): Promise<QueryResult> {
    return this.readWithinSessionMode(() => this.readThroughCursor(sql, maxRows));
  }

  private async readThroughCursor(sql: string, maxRows: number): Promise<QueryResult> {
    const startedAt = Date.now();
    const cursor = this.client.query(createArrayCursor(sql));
    this.runningQueries++;

    try {
      const { rows, fields, rowCount } = await readBatch(cursor, maxRows + 1);
      await cursor.close();
      const columns = fields.map((field) => field.name);

      return {
        columns,
        rows: rows.slice(0, maxRows),
        affectedRows: columns.length > 0 ? undefined : (rowCount ?? undefined),
        truncated: rows.length > maxRows,
        durationMs: Date.now() - startedAt,
      };
    } finally {
      this.runningQueries--;
    }
  }

  queryPage(statement: ParameterizedStatement): Promise<QueryResult> {
    return this.readWithinSessionMode(() => this.readPage(statement));
  }

  private async readPage(statement: ParameterizedStatement): Promise<QueryResult> {
    const startedAt = Date.now();
    const result = await this.client.query<unknown[]>({
      text: statement.sql,
      values: [...statement.params],
      rowMode: 'array',
      types: rawTextTypes,
      ...SINGLE_STATEMENT_PROTOCOL,
    });
    return {
      columns: result.fields.map((field) => field.name),
      rows: result.rows,
      truncated: false,
      durationMs: Date.now() - startedAt,
    };
  }

  async applyStatements(statements: readonly ParameterizedStatement[]): Promise<number> {
    const client = this.createDedicatedClient();
    await client.connect();
    try {
      if (this.isSessionReadOnly) {
        await client.query(READ_ONLY_SESSION_SQL);
      }
      await client.query('BEGIN');
      const affectedRows = await runInOrder(client, statements);
      await client.query('COMMIT');
      return affectedRows;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      await client.end();
    }
  }

  async cancelRunningQuery(): Promise<void> {
    if (this.runningQueries === 0 || this.backendPid === undefined) {
      return;
    }
    const canceller = this.createDedicatedClient();
    await canceller.connect();
    try {
      await canceller.query(CANCEL_BACKEND_SQL, [this.backendPid]);
    } finally {
      await canceller.end();
    }
  }

  async *streamRows(statement: ParameterizedStatement, batchSize: number): AsyncIterable<RowBatch> {
    const client = this.createDedicatedClient();
    await client.connect();
    if (this.isSessionReadOnly) {
      await client.query(READ_ONLY_TRANSACTION_SQL);
    }
    const cursor = client.query(createArrayCursor(statement.sql, statement.params));

    try {
      let batch = await readBatch(cursor, batchSize);
      const columns = batch.fields.map((field) => field.name);
      yield { columns, rows: batch.rows };

      while (batch.rows.length === batchSize) {
        batch = await readBatch(cursor, batchSize);
        yield { columns, rows: batch.rows };
      }
    } finally {
      await cursor.close();
      await client.end();
    }
  }

  async enforceReadOnly(): Promise<void> {
    await this.client.query(READ_ONLY_SESSION_SQL);
    this.isSessionReadOnly = true;
  }

  buildSelectPreview(table: TableRef, limit: number): string {
    return `SELECT * FROM ${quoteTable('postgres', table)} LIMIT ${limit};`;
  }

  private readWithinSessionMode<T>(read: () => Promise<T>): Promise<T> {
    if (!this.isSessionReadOnly) {
      return read();
    }
    const pending = this.readOnlyQueue.then(() => this.readInReadOnlyTransaction(read));
    this.readOnlyQueue = pending.catch(ignoreDropOutsideQuery);
    return pending;
  }

  private async readInReadOnlyTransaction<T>(read: () => Promise<T>): Promise<T> {
    await this.client.query(READ_ONLY_TRANSACTION_SQL);
    try {
      return await read();
    } finally {
      await this.client.query(ROLLBACK_SQL).catch(ignoreDropOutsideQuery);
    }
  }

  private createDedicatedClient(): Client {
    const client = new Client(this.clientConfig);
    client.on('error', ignoreDropOutsideQuery);
    return client;
  }
}

function ignoreDropOutsideQuery(): void {
  return undefined;
}

async function runInOrder(client: Client, statements: readonly ParameterizedStatement[]): Promise<number> {
  let affectedRows = 0;
  for (const statement of statements) {
    const result = await client.query({ text: statement.sql, values: [...statement.params], ...SINGLE_STATEMENT_PROTOCOL });
    assertExpectedRows(statement, result.rowCount ?? 0);
    affectedRows += result.rowCount ?? 0;
  }
  return affectedRows;
}

interface CursorBatch {
  readonly rows: unknown[][];
  readonly fields: readonly FieldDef[];
  readonly rowCount: number | null;
}

function createArrayCursor(sql: string, params: readonly CellValue[] = []): Cursor<unknown[]> {
  return new Cursor<unknown[]>(sql, [...params], { rowMode: 'array', types: rawDateTypes });
}

function readBatch(cursor: Cursor<unknown[]>, size: number): Promise<CursorBatch> {
  return new Promise((resolve, reject) => {
    cursor.read(size, (error, rows, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ rows, fields: result.fields ?? [], rowCount: result.rowCount });
    });
  });
}
