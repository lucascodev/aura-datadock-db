import { Client, type FieldDef, type QueryResult as PgQueryResult } from 'pg';
import type { ConnectionTarget } from '../../domain/ConnectionTarget';
import type { DatabaseAdapter } from '../../domain/DatabaseAdapter';
import type { QueryResult } from '../../domain/QueryResult';
import type { TableColumn } from '../../domain/TableColumn';
import type { TableRef } from '../../domain/TableRef';

const CONNECT_TIMEOUT_MS = 5000;

export class PostgresAdapter implements DatabaseAdapter {
  private readonly client: Client;

  constructor(target: ConnectionTarget) {
    this.client = new Client({
      host: target.host,
      port: target.port,
      user: target.user,
      password: target.password,
      database: target.database,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      application_name: 'Aura DataDock',
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async dispose(): Promise<void> {
    await this.client.end();
  }

  async listNamespaces(): Promise<string[]> {
    const result = await this.client.query<{ schema_name: string }>(
      `SELECT schema_name
         FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
          AND schema_name NOT LIKE 'pg_toast%'
          AND schema_name NOT LIKE 'pg_temp%'
        ORDER BY schema_name`,
    );
    return result.rows.map((row) => row.schema_name);
  }

  async listTables(namespace: string): Promise<TableRef[]> {
    const result = await this.client.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_name`,
      [namespace],
    );
    return result.rows.map((row) => ({ namespace, name: row.table_name }));
  }

  async listColumns(table: TableRef): Promise<TableColumn[]> {
    const result = await this.client.query<{
      column_name: string;
      data_type: string;
      is_nullable: 'YES' | 'NO';
      column_default: string | null;
      is_primary_key: boolean;
    }>(
      `SELECT c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              EXISTS (
                SELECT 1
                  FROM information_schema.table_constraints tc
                  JOIN information_schema.key_column_usage kcu
                    ON kcu.constraint_name = tc.constraint_name
                   AND kcu.table_schema = tc.table_schema
                 WHERE tc.constraint_type = 'PRIMARY KEY'
                   AND tc.table_schema = c.table_schema
                   AND tc.table_name = c.table_name
                   AND kcu.column_name = c.column_name
              ) AS is_primary_key
         FROM information_schema.columns c
        WHERE c.table_schema = $1
          AND c.table_name = $2
        ORDER BY c.ordinal_position`,
      [table.namespace, table.name],
    );
    return result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: row.is_primary_key,
      defaultValue: row.column_default ?? undefined,
    }));
  }

  async runQuery(sql: string, maxRows: number): Promise<QueryResult> {
    const startedAt = Date.now();
    const result = lastStatementResult(await this.client.query(sql));
    const rows = result.rows ?? [];
    const returnsRows = result.fields !== undefined && result.fields.length > 0;

    return {
      columns: (result.fields ?? []).map((field: FieldDef) => field.name),
      rows: rows.slice(0, maxRows),
      affectedRows: returnsRows ? undefined : (result.rowCount ?? undefined),
      truncated: rows.length > maxRows,
      durationMs: Date.now() - startedAt,
    };
  }

  async enforceReadOnly(): Promise<void> {
    await this.client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
  }

  buildSelectPreview(table: TableRef, limit: number): string {
    return `SELECT * FROM ${quote(table.namespace)}.${quote(table.name)} LIMIT ${limit};`;
  }
}

function lastStatementResult(raw: PgQueryResult | PgQueryResult[]): PgQueryResult {
  return Array.isArray(raw) ? raw[raw.length - 1] : raw;
}

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
