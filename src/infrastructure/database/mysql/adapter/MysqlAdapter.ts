import { createConnection as createStreamingConnection } from 'mysql2';
import mysql, { type Connection, type ConnectionOptions, type FieldPacket, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../domain/database/ports/DatabaseAdapter';
import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import { type ParameterizedStatement } from '../../../../domain/database/model/ParameterizedStatement';
import { assertExpectedRows } from '../../../../domain/database/rules/assertExpectedRows';
import type { QueryResult } from '../../../../domain/database/model/QueryResult';
import type { RowBatch } from '../../../../domain/database/model/RowBatch';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { LIST_COLUMNS_SQL, LIST_FOREIGN_KEYS_SQL, LIST_INDEXES_SQL, LIST_TABLES_SQL } from '../constants/mysqlCatalogQueries';
import type { MysqlColumnRow, MysqlForeignKeyRow, MysqlIndexRow, MysqlTableRow } from '../model/mysqlSchemaRows';
import { isBaseTable } from './isBaseTable';
import { toMysqlSchema } from './toMysqlSchema';
import { toMysqlSsl } from './toMysqlSsl';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { CONNECT_TIMEOUT_MS } from '../../constants/connectTimeout';

const SYSTEM_DATABASES = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);
const RESET_SELECT_LIMIT_SQL = 'SET SESSION sql_select_limit = DEFAULT';
const READ_ONLY_SESSION_SQL = 'SET SESSION TRANSACTION READ ONLY';

type RawResult = RowDataPacket[] | RowDataPacket[][] | ResultSetHeader;
type RawFields = FieldPacket[] | FieldPacket[][] | undefined;

export class MysqlAdapter implements DatabaseAdapter {
  private readonly connectionOptions: ConnectionOptions;
  private readonly kind: DriverId;
  private isSessionReadOnly = false;
  private connection?: Connection;
  private runningQueries = 0;
  private disconnectListener?: () => void;

  constructor(target: ConnectionTarget) {
    this.kind = target.kind;
    this.connectionOptions = {
      host: target.host,
      port: target.port,
      user: target.user,
      password: target.password,
      database: target.database,
      connectTimeout: CONNECT_TIMEOUT_MS,
      dateStrings: true,
      ssl: toMysqlSsl(target.tls),
      enableKeepAlive: true,
      supportBigNumbers: true,
    };
  }

  onDisconnect(listener: () => void): void {
    this.disconnectListener = listener;
  }

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection(this.connectionOptions);
    this.connection.on('error', () => this.disconnectListener?.());
    this.connection.on('end', () => this.disconnectListener?.());
  }

  async dispose(): Promise<void> {
    await this.connection?.end();
    this.connection = undefined;
  }

  async listNamespaces(): Promise<string[]> {
    const [rows] = await this.db.query<RowDataPacket[]>('SHOW DATABASES');
    return rows.map((row) => String(row.Database)).filter((name) => !SYSTEM_DATABASES.has(name));
  }

  async listTables(namespace: string): Promise<TableRef[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(LIST_TABLES_SQL, [namespace]);
    return (rows as unknown as MysqlTableRow[]).map((row) => ({
      namespace,
      name: row.tableName,
      kind: isBaseTable(row.tableType) ? 'table' : 'view',
    }));
  }

  async readSchema(namespace: string): Promise<NamespaceSchema> {
    const [tables] = await this.db.query<RowDataPacket[]>(LIST_TABLES_SQL, [namespace]);
    const [columns] = await this.db.query<RowDataPacket[]>(LIST_COLUMNS_SQL, [namespace]);
    const [foreignKeys] = await this.db.query<RowDataPacket[]>(LIST_FOREIGN_KEYS_SQL, [namespace]);
    const [indexes] = await this.db.query<RowDataPacket[]>(LIST_INDEXES_SQL, [namespace]);

    return toMysqlSchema(this.kind, namespace, {
      tables: tables as unknown as MysqlTableRow[],
      columns: columns as unknown as MysqlColumnRow[],
      foreignKeys: foreignKeys as unknown as MysqlForeignKeyRow[],
      indexes: indexes as unknown as MysqlIndexRow[],
    });
  }

  async runQuery(sql: string, maxRows: number): Promise<QueryResult> {
    const startedAt = Date.now();
    this.runningQueries++;

    try {
      const [result, fields] = await this.queryWithSelectLimit(sql, maxRows);

      if (!Array.isArray(result)) {
        return { columns: [], rows: [], affectedRows: result.affectedRows, truncated: false, durationMs: Date.now() - startedAt };
      }

      const { rows, columns } = firstResultSet(result, fields);
      return {
        columns,
        rows: rows.slice(0, maxRows),
        truncated: rows.length > maxRows,
        durationMs: Date.now() - startedAt,
      };
    } finally {
      this.runningQueries--;
    }
  }

  async queryPage(statement: ParameterizedStatement): Promise<QueryResult> {
    const startedAt = Date.now();
    const [result, fields] = await this.db.execute<RowDataPacket[]>({ sql: statement.sql, rowsAsArray: true }, [...statement.params]);
    return {
      columns: fields.map((field) => field.name),
      rows: result as unknown as unknown[][],
      truncated: false,
      durationMs: Date.now() - startedAt,
    };
  }

  async applyStatements(statements: readonly ParameterizedStatement[]): Promise<number> {
    const connection = await mysql.createConnection(this.connectionOptions);
    try {
      if (this.isSessionReadOnly) {
        await connection.query(READ_ONLY_SESSION_SQL);
      }
      await connection.beginTransaction();
      const affectedRows = await runInOrder(connection, statements);
      await connection.commit();
      return affectedRows;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      await connection.end();
    }
  }

  async cancelRunningQuery(): Promise<void> {
    if (this.runningQueries === 0) {
      return;
    }
    const canceller = await mysql.createConnection(this.connectionOptions);
    try {
      await canceller.query(`KILL QUERY ${this.db.threadId}`);
    } finally {
      await canceller.end();
    }
  }

  async *streamRows(statement: ParameterizedStatement, batchSize: number): AsyncIterable<RowBatch> {
    const dedicated = createStreamingConnection(this.connectionOptions);
    if (this.isSessionReadOnly) {
      dedicated.query(READ_ONLY_SESSION_SQL);
    }
    const query = dedicated.query({ sql: statement.sql, values: [...statement.params], rowsAsArray: true });
    const stream = query.stream({ highWaterMark: batchSize });
    dedicated.once('error', (error) => stream.destroy(error));
    let columns: readonly string[] = [];
    query.once('fields', (fields: FieldPacket[]) => {
      columns = fields.map((field) => field.name);
    });

    try {
      let rows: unknown[][] = [];
      let hasYielded = false;
      for await (const row of stream) {
        rows.push(row as unknown[]);
        if (rows.length === batchSize) {
          yield { columns, rows };
          hasYielded = true;
          rows = [];
        }
      }
      if (rows.length > 0 || !hasYielded) {
        yield { columns, rows };
      }
    } finally {
      dedicated.destroy();
    }
  }

  async enforceReadOnly(): Promise<void> {
    await this.db.query(READ_ONLY_SESSION_SQL);
    this.isSessionReadOnly = true;
  }

  buildSelectPreview(table: TableRef, limit: number): string {
    return `SELECT * FROM ${quoteTable(this.kind, table)} LIMIT ${limit};`;
  }

  private async queryWithSelectLimit(sql: string, maxRows: number): Promise<[RawResult, RawFields]> {
    const pending = [
      this.db.query(`SET SESSION sql_select_limit = ${maxRows + 1}`),
      this.db.query({ sql, rowsAsArray: true }),
      this.db.query(RESET_SELECT_LIMIT_SQL),
    ];
    const outcomes = await Promise.allSettled(pending);
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        throw outcome.reason;
      }
    }
    return (outcomes[1] as PromiseFulfilledResult<unknown>).value as [RawResult, RawFields];
  }

  private get db(): Connection {
    if (!this.connection) {
      throw new Error(l10n.t('MySQL connection is not open'));
    }
    return this.connection;
  }
}

async function runInOrder(connection: Connection, statements: readonly ParameterizedStatement[]): Promise<number> {
  let affectedRows = 0;
  for (const statement of statements) {
    const [result] = await connection.execute<ResultSetHeader>(statement.sql, [...statement.params]);
    assertExpectedRows(statement, result.affectedRows);
    affectedRows += result.affectedRows;
  }
  return affectedRows;
}

function firstResultSet(result: RowDataPacket[] | RowDataPacket[][], fields: RawFields): { rows: unknown[][]; columns: string[] } {
  const firstField = fields?.[0];
  if (Array.isArray(firstField)) {
    return { rows: result[0] as unknown as unknown[][], columns: firstField.map((field) => field.name) };
  }
  return { rows: result as unknown as unknown[][], columns: ((fields ?? []) as FieldPacket[]).map((field) => field.name) };
}
