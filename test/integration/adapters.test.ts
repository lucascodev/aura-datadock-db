import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdapter } from '../../src/infrastructure/database/factory/createAdapter';
import { encodeRows } from '../../src/application/export/encoders/writing/encodeRows';
import { createCsvEncoder } from '../../src/application/export/encoders/formats/createCsvEncoder';
import { buildRelationships } from '../../src/application/schema/relationships/buildRelationships';
import { renderDdl } from '../../src/application/schema/rendering/renderDdl';
import { scanStatements } from '../../src/application/query/analysis/scanStatements';
import type { ConnectionTarget } from '../../src/domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../src/domain/database/ports/DatabaseAdapter';
import type { DriverId } from '../../src/domain/driver/model/DriverId';
import type { NamespaceSchema } from '../../src/domain/schema/model/NamespaceSchema';
import type { ParameterizedStatement } from '../../src/domain/database/model/ParameterizedStatement';
import { quoteTable } from '../../src/drivers/catalog/quoteTable';
import type { RowBatch } from '../../src/domain/database/model/RowBatch';

interface Engine {
  readonly kind: DriverId;
  readonly port?: string;
  readonly user: string;
  readonly namespace: string;
  readonly sequenceSql: (count: number) => string;
  readonly sleepSql: string;
  readonly timestampSql: string;
  readonly expectedStatusType: string;
  readonly backendIdSql: string;
  readonly killSql: (id: unknown) => string;
}

const engines: readonly Engine[] = [
  {
    kind: 'postgres',
    port: process.env.DATADOCK_TEST_POSTGRES_PORT,
    user: 'datadock',
    namespace: 'public',
    sequenceSql: (count) => `SELECT n FROM generate_series(1, ${count}) AS n`,
    sleepSql: 'SELECT pg_sleep(30)',
    timestampSql: `SELECT TIMESTAMP '2024-01-02 03:04:05' AS t, DATE '2024-01-02' AS d`,
    expectedStatusType: 'text',
    backendIdSql: 'SELECT pg_backend_pid()',
    killSql: (id) => `SELECT pg_terminate_backend(${Number(id)})`,
  },
  {
    kind: 'mysql',
    port: process.env.DATADOCK_TEST_MYSQL_PORT,
    user: 'root',
    namespace: 'shop',
    sequenceSql: (count) =>
      `WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < ${count}) SELECT n FROM seq`,
    sleepSql: 'SELECT SLEEP(30)',
    timestampSql: `SELECT TIMESTAMP '2024-01-02 03:04:05' AS t, DATE '2024-01-02' AS d`,
    expectedStatusType: 'varchar(20)',
    backendIdSql: 'SELECT CONNECTION_ID()',
    killSql: (id) => `KILL ${Number(id)}`,
  },
  {
    kind: 'mariadb',
    port: process.env.DATADOCK_TEST_MARIADB_PORT,
    user: 'root',
    namespace: 'shop',
    sequenceSql: (count) => `SELECT seq AS n FROM seq_1_to_${count}`,
    sleepSql: 'SELECT SLEEP(30)',
    timestampSql: `SELECT TIMESTAMP '2024-01-02 03:04:05' AS t, DATE '2024-01-02' AS d`,
    expectedStatusType: 'varchar(20)',
    backendIdSql: 'SELECT CONNECTION_ID()',
    killSql: (id) => `KILL ${Number(id)}`,
  },
];

function toTarget(engine: Engine, database = 'shop'): ConnectionTarget {
  return {
    id: `${engine.kind}-${database}`,
    key: `docker:${engine.kind}-test`,
    name: `${engine.kind}-test`,
    detail: engine.kind,
    source: 'docker',
    kind: engine.kind,
    host: '127.0.0.1',
    port: Number(engine.port),
    user: engine.user,
    password: 'datadock',
    database,
    credentialSource: 'container-env',
    isRemote: false,
    isReadOnly: false,
    tls: { mode: 'off' },
  };
}

async function open(engine: Engine, database?: string): Promise<DatabaseAdapter> {
  const adapter = createAdapter(toTarget(engine, database));
  await adapter.connect();
  return adapter;
}

function comparableColumns(schema: NamespaceSchema, table: string) {
  return schema.tables
    .find((candidate) => candidate.name === table)
    ?.columns.map((column) => ({ name: column.name, type: column.dataType, nullable: column.nullable, pk: column.isPrimaryKey }));
}

describe.each(engines)('$kind adapter', (engine) => {
  describe.skipIf(!engine.port)('against a real database', () => {
    let adapter: DatabaseAdapter;
    let schema: NamespaceSchema;

    beforeAll(async () => {
      adapter = await open(engine);
      schema = await adapter.readSchema(engine.namespace);
    });

    afterAll(async () => {
      await adapter.dispose();
    });

    const table = (name: string) => {
      const found = schema.tables.find((candidate) => candidate.name === name);
      if (!found) {
        throw new Error(`Table ${name} not found`);
      }
      return found;
    };

    describe('readSchema', () => {
      it('reads tables and views', () => {
        expect(schema.tables.map((candidate) => candidate.name).sort()).toEqual(
          ['audit_log', 'customer_profiles', 'customers', 'order_items', 'orders', 'paid_orders', 'products'],
        );
        expect(table('orders').kind).toBe('table');
        expect(table('paid_orders').kind).toBe('view');
        expect(table('paid_orders').viewDefinition).toMatch(/paid/);
      });

      it('reads real column types and nullability', () => {
        const status = table('orders').columns.find((column) => column.name === 'status');
        expect(status).toMatchObject({ dataType: engine.expectedStatusType, nullable: false });
        const name = table('customers').columns.find((column) => column.name === 'name');
        expect(name?.dataType).toMatch(/^(character varying|varchar)\(120\)$/);
      });

      it('reads composite primary keys in order', () => {
        expect(table('order_items').primaryKey).toEqual(['order_id', 'product_id']);
      });

      it('derives the relationships of the seed', () => {
        const relationships = buildRelationships(schema);
        const find = (child: string, parent: string) =>
          relationships.find((relationship) => relationship.childTable === child && relationship.parentTable === parent);

        expect(find('customer_profiles', 'customers')).toMatchObject({ cardinality: 'one-to-one', isParentOptional: false });
        expect(find('orders', 'customers')).toMatchObject({ cardinality: 'one-to-many', isParentOptional: false });
        expect(find('customers', 'customers')).toMatchObject({ cardinality: 'one-to-many', isParentOptional: true });
        expect(find('order_items', 'orders')?.cardinality).toBe('one-to-many');
        expect(find('order_items', 'products')?.cardinality).toBe('one-to-many');
      });

      it('reads foreign keys that cross namespaces', () => {
        const foreignKey = table('orders').foreignKeys.find((candidate) => candidate.columns[0] === 'warehouse_id');
        expect(foreignKey).toMatchObject({ referencedNamespace: 'logistics', referencedTable: 'warehouses', referencedColumns: ['id'] });
      });

      it('reads referential actions', () => {
        const foreignKey = table('customer_profiles').foreignKeys[0];
        expect(foreignKey.onDelete).toBe('CASCADE');
      });

      it('reads unique and regular indexes', () => {
        const indexes = table('orders').indexes;
        expect(indexes.find((index) => index.name === 'orders_status_idx')).toMatchObject({ columns: ['status'], isUnique: false, isPrimary: false });
        expect(table('customers').indexes.find((index) => index.columns.join() === 'email')?.isUnique).toBe(true);
      });

      it('agrees with listTables on names and kinds', async () => {
        const tables = await adapter.listTables(engine.namespace);
        expect(tables.map(({ name, kind }) => ({ name, kind }))).toEqual(schema.tables.map(({ name, kind }) => ({ name, kind })));
      });
    });

    describe('renderDdl', () => {
      it('recreates the schema in an empty database', async () => {
        const copy = 'shop_copy';
        const logistics = await adapter.readSchema('logistics');
        await adapter.runQuery(`DROP DATABASE IF EXISTS ${copy}`, 1);
        await adapter.runQuery(`CREATE DATABASE ${copy}`, 1);

        const copyAdapter = await open(engine, copy);
        try {
          const ddl = rewriteForCopy(engine.kind, `${renderDdl(logistics)}\n${renderDdl(schema)}`, copy);
          if (engine.kind === 'postgres') {
            await copyAdapter.runQuery('CREATE SCHEMA logistics', 1);
          } else {
            await copyAdapter.runQuery('DROP DATABASE IF EXISTS logistics_copy', 1);
            await copyAdapter.runQuery('CREATE DATABASE logistics_copy', 1);
          }
          for (const statement of scanStatements(ddl, engine.kind)) {
            await copyAdapter.runQuery(statement.text, 1);
          }

          const copied = await copyAdapter.readSchema(engine.kind === 'postgres' ? 'public' : copy);
          for (const original of schema.tables) {
            expect(comparableColumns(copied, original.name), original.name).toEqual(comparableColumns(schema, original.name));
          }
          expect(buildRelationships(copied).length).toBe(buildRelationships(schema).length);
        } finally {
          await copyAdapter.dispose();
          await adapter.runQuery(`DROP DATABASE IF EXISTS ${copy}`, 1);
          if (engine.kind !== 'postgres') {
            await adapter.runQuery('DROP DATABASE IF EXISTS logistics_copy', 1);
          }
        }
      });
    });

    describe('runQuery', () => {
      it('keeps columns with the same name apart', async () => {
        const result = await adapter.runQuery(
          'SELECT c.id, o.id, c.name FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.id = 3',
          10,
        );
        expect(result.columns).toEqual(['id', 'id', 'name']);
        expect(result.rows).toEqual([[2, 3, 'Bruno Lima']]);
      });

      it('stops at the row limit and reports truncation', async () => {
        const result = await adapter.runQuery(engine.sequenceSql(50), 10);
        expect(result.rows).toHaveLength(10);
        expect(result.truncated).toBe(true);
      });

      it('does not report truncation at the exact limit', async () => {
        const result = await adapter.runQuery(engine.sequenceSql(10), 10);
        expect(result.rows).toHaveLength(10);
        expect(result.truncated).toBe(false);
      });

      it('returns dates exactly as stored, without timezone conversion', async () => {
        const result = await adapter.runQuery(engine.timestampSql, 1);
        expect(result.rows[0]).toEqual(['2024-01-02 03:04:05', '2024-01-02']);
      });

      it('returns binary values as buffers', async () => {
        const result = await adapter.runQuery(`SELECT image FROM products WHERE sku = 'KB-01'`, 1);
        expect(Buffer.isBuffer(result.rows[0][0])).toBe(true);
      });

      it('reports affected rows of writes', async () => {
        await adapter.runQuery(`INSERT INTO audit_log (entry) VALUES ('a'), ('b')`, 10);
        const result = await adapter.runQuery(`DELETE FROM audit_log WHERE entry IN ('a', 'b')`, 10);
        expect(result.columns).toEqual([]);
        expect(result.affectedRows).toBe(2);
      });

      it('rejects bad SQL and stays usable', async () => {
        await expect(adapter.runQuery('SELECT * FROM does_not_exist', 10)).rejects.toThrow(/does_not_exist/);
        const result = await adapter.runQuery('SELECT 1 AS one', 10);
        expect(result.rows).toEqual([[1]]);
      });

      it('does not let the row limit leak into metadata reads', async () => {
        const [limited, tables] = await Promise.all([adapter.runQuery('SELECT * FROM customers', 1), adapter.listTables(engine.namespace)]);
        expect(limited.rows).toHaveLength(1);
        expect(tables.length).toBe(schema.tables.length);
        expect((await adapter.readSchema(engine.namespace)).tables.length).toBe(schema.tables.length);
      });

      it('keeps session state between statements, so explicit transactions work', async () => {
        await adapter.runQuery('BEGIN', 1);
        await adapter.runQuery(`INSERT INTO audit_log (entry) VALUES ('rolled back')`, 1);
        await adapter.runQuery('ROLLBACK', 1);
        const result = await adapter.runQuery(`SELECT COUNT(*) FROM audit_log WHERE entry = 'rolled back'`, 1);
        expect(Number(result.rows[0][0])).toBe(0);
      });
    });

    describe('cancelRunningQuery', () => {
      it('stops a slow query', async () => {
        const startedAt = Date.now();
        const running = adapter.runQuery(engine.sleepSql, 1).then(
          () => 'finished',
          () => 'failed',
        );
        await new Promise((resolve) => setTimeout(resolve, 400));
        await adapter.cancelRunningQuery();
        await running;
        expect(Date.now() - startedAt).toBeLessThan(10_000);

        const result = await adapter.runQuery('SELECT 1 AS one', 10);
        expect(result.rows).toEqual([[1]]);
      });

      it('does nothing when no query is running', async () => {
        await expect(adapter.cancelRunningQuery()).resolves.toBeUndefined();
      });
    });

    describe('streamRows', () => {
      const customers = { namespace: engine.namespace, name: 'customers', kind: 'table' as const };

      async function collect(batchSize: number): Promise<RowBatch[]> {
        const batches: RowBatch[] = [];
        for await (const batch of adapter.streamRows(selectAll(engine.kind, customers), batchSize)) {
          batches.push(batch);
        }
        return batches;
      }

      it('returns every row in batches with columns', async () => {
        const batches = await collect(2);
        expect(batches.flatMap((batch) => batch.rows)).toHaveLength(3);
        expect(batches[0].rows).toHaveLength(2);
        expect(batches[0].columns).toContain('email');
      });

      it('returns the columns of an empty table', async () => {
        await adapter.runQuery('CREATE TABLE stream_empty (only_column INTEGER)', 1);
        try {
          const batches: RowBatch[] = [];
          for await (const batch of adapter.streamRows(selectAll(engine.kind, { namespace: engine.namespace, name: 'stream_empty' }), 10)) {
            batches.push(batch);
          }
          expect(batches).toEqual([{ columns: ['only_column'], rows: [] }]);
        } finally {
          await adapter.runQuery('DROP TABLE stream_empty', 1);
        }
      });

      it('can stop early without blocking the main connection', async () => {
        for await (const batch of adapter.streamRows(selectAll(engine.kind, customers), 1)) {
          expect(batch.rows).toHaveLength(1);
          break;
        }
        expect((await adapter.runQuery('SELECT 1 AS one', 1)).rows).toEqual([[1]]);
      });

      it('feeds the row encoders', async () => {
        const [first] = await collect(10);
        const csv = encodeRows(createCsvEncoder(), first);
        expect(csv.split('\r\n')[0]).toContain('email');
        expect(csv).toContain('ana@example.com');
      });
    });

    describe('enforceReadOnly', () => {
      it('makes the database reject writes on that session', async () => {
        const readOnly = await open(engine);
        try {
          await readOnly.enforceReadOnly();
          await expect(readOnly.runQuery(`INSERT INTO audit_log (entry) VALUES ('x')`, 1)).rejects.toThrow(/read.only/i);
          expect((await readOnly.runQuery('SELECT 1 AS one', 1)).rows).toEqual([[1]]);
        } finally {
          await readOnly.dispose();
        }
      });
    });

    describe('onDisconnect', () => {
      it('notifies when the server drops the connection, without crashing the process', async () => {
        const doomed = await open(engine);
        const disconnected = new Promise<void>((resolve) => doomed.onDisconnect(resolve));
        const { rows } = await doomed.runQuery(engine.backendIdSql, 1);

        await adapter.runQuery(engine.killSql(rows[0][0]), 1);
        await expect(disconnected).resolves.toBeUndefined();
      });
    });
  });
});

function selectAll(kind: DriverId, table: { readonly namespace: string; readonly name: string }): ParameterizedStatement {
  const sql = `SELECT * FROM ${quoteTable(kind, table)}`;
  return { sql, params: [], preview: sql };
}

function rewriteForCopy(kind: DriverId, ddl: string, copy: string): string {
  if (kind === 'postgres') {
    return ddl;
  }
  return ddl.replaceAll('`shop`.', `\`${copy}\`.`).replaceAll('`logistics`.', '`logistics_copy`.');
}
