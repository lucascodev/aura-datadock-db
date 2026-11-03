import mysql, { type Connection, type FieldPacket, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { ConnectionTarget } from '../../domain/ConnectionTarget';
import type { DatabaseAdapter } from '../../domain/DatabaseAdapter';
import type { QueryResult } from '../../domain/QueryResult';
import type { TableColumn } from '../../domain/TableColumn';
import type { TableRef } from '../../domain/TableRef';

const CONNECT_TIMEOUT_MS = 5000;
const SYSTEM_DATABASES = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);

export class MysqlAdapter implements DatabaseAdapter {
  private connection?: Connection;

  constructor(private readonly target: ConnectionTarget) {}

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.target.host,
      port: this.target.port,
      user: this.target.user,
      password: this.target.password,
      database: this.target.database,
      connectTimeout: CONNECT_TIMEOUT_MS,
      dateStrings: true,
    });
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
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS name
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME`,
      [namespace],
    );
    return rows.map((row) => ({ namespace, name: String(row.name) }));
  }

  async listColumns(table: TableRef): Promise<TableColumn[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME AS name,
              COLUMN_TYPE AS dataType,
              IS_NULLABLE AS nullable,
              COLUMN_DEFAULT AS defaultValue,
              COLUMN_KEY AS columnKey
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [table.namespace, table.name],
    );
    return rows.map((row) => ({
      name: String(row.name),
      dataType: String(row.dataType),
      nullable: row.nullable === 'YES',
      isPrimaryKey: row.columnKey === 'PRI',
      defaultValue: row.defaultValue ?? undefined,
    }));
  }

  async runQuery(sql: string, maxRows: number): Promise<QueryResult> {
    const startedAt = Date.now();
    const [result, fields] = await this.db.query(sql);

    if (!Array.isArray(result)) {
      const header = result as ResultSetHeader;
      return { columns: [], rows: [], affectedRows: header.affectedRows, truncated: false, durationMs: Date.now() - startedAt };
    }

    const rows = result as RowDataPacket[];
    return {
      columns: ((fields as FieldPacket[] | undefined) ?? []).map((field) => field.name),
      rows: rows.slice(0, maxRows),
      truncated: rows.length > maxRows,
      durationMs: Date.now() - startedAt,
    };
  }

  async enforceReadOnly(): Promise<void> {
    await this.db.query('SET SESSION TRANSACTION READ ONLY');
  }

  buildSelectPreview(table: TableRef, limit: number): string {
    return `SELECT * FROM ${quote(table.namespace)}.${quote(table.name)} LIMIT ${limit};`;
  }

  private get db(): Connection {
    if (!this.connection) {
      throw new Error('MySQL connection is not open');
    }
    return this.connection;
  }
}

function quote(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}
