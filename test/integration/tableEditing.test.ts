import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdapter } from '../../src/infrastructure/database/factory/createAdapter';
import { toConnectionTarget } from '../../src/application/connections/saved/toConnectionTarget';
import { buildRowChangeStatements } from '../../src/application/editing/rows/buildRowChangeStatements';
import { buildTablePageQuery, buildTableSelect } from '../../src/application/editing/browsing/buildTablePageQuery';
import type { RowChange } from '../../src/application/editing/rows/RowChange';
import type { TableFilter } from '../../src/application/editing/browsing/tableFilters';
import type { ConnectionTarget } from '../../src/domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../src/domain/database/DatabaseAdapter';
import type { DriverId } from '../../src/domain/driver/DriverId';
import type { RowBatch } from '../../src/domain/database/RowBatch';
import type { TableDefinition } from '../../src/domain/schema/TableDefinition';
import { openAdapter } from '../../src/infrastructure/ssh/openAdapter';

interface Engine {
  readonly kind: DriverId;
  readonly port?: string;
  readonly user: string;
  readonly namespace: string;
  readonly createTable: string;
  readonly otherSessionDelete: string;
}

const engines: readonly Engine[] = [
  {
    kind: 'postgres',
    port: process.env.DATADOCK_TEST_POSTGRES_PORT,
    user: 'datadock',
    namespace: 'public',
    createTable: `CREATE TABLE editing_test (
      region TEXT NOT NULL,
      id BIGINT NOT NULL,
      name TEXT,
      note TEXT NOT NULL DEFAULT 'none',
      PRIMARY KEY (region, id)
    )`,
    otherSessionDelete: `DELETE FROM editing_test WHERE id = 2`,
  },
  ...['mysql', 'mariadb'].map((kind): Engine => ({
    kind,
    port: kind === 'mysql' ? process.env.DATADOCK_TEST_MYSQL_PORT : process.env.DATADOCK_TEST_MARIADB_PORT,
    user: 'root',
    namespace: 'shop',
    createTable: `CREATE TABLE editing_test (
      region VARCHAR(20) NOT NULL,
      id BIGINT NOT NULL,
      name VARCHAR(200),
      note VARCHAR(200) NOT NULL DEFAULT 'none',
      PRIMARY KEY (region, id)
    )`,
    otherSessionDelete: `DELETE FROM editing_test WHERE id = 2`,
  })),
];

const BIG_ID = '9007199254740993';

function toTarget(engine: Engine, ssh?: ConnectionTarget['ssh']): ConnectionTarget {
  return {
    ...toConnectionTarget({
      id: `${engine.kind}-editing`,
      name: `${engine.kind}-editing`,
      kind: engine.kind,
      host: '127.0.0.1',
      port: Number(engine.port),
      user: engine.user,
      database: 'shop',
      tlsMode: 'off',
      isReadOnly: false,
      ssh,
    }),
    password: 'datadock',
  };
}

describe.each(engines)('editing data on $kind', (engine) => {
  describe.skipIf(!engine.port)('against a real database', () => {
    let adapter: DatabaseAdapter;
    let table: TableDefinition;

    const changes = (rowChanges: readonly RowChange[]) => buildRowChangeStatements(table, engine.kind, false, rowChanges);
    const apply = (rowChanges: readonly RowChange[]) => adapter.applyStatements(changes(rowChanges));

    async function readRows(filters: readonly TableFilter[] = []): Promise<readonly (readonly unknown[])[]> {
      const { page } = buildTablePageQuery(table, engine.kind, { offset: 0, limit: 100, filters });
      return (await adapter.queryPage(page)).rows;
    }

    beforeAll(async () => {
      adapter = createAdapter(toTarget(engine));
      await adapter.connect();
      await adapter.runQuery('DROP TABLE IF EXISTS editing_test', 1);
      await adapter.runQuery(engine.createTable, 1);
      table = (await adapter.readSchema(engine.namespace)).tables.find((candidate) => candidate.name === 'editing_test') as TableDefinition;
    });

    afterAll(async () => {
      await adapter.runQuery('DROP TABLE IF EXISTS editing_test', 1);
      await adapter.dispose();
    });

    it('inserts with a composite key, NULL, quotes and the database default', async () => {
      const affected = await apply([
        { type: 'insert', id: 'a', values: { region: 'br', id: '1', name: "O'Brien \\ \"x\"" } },
        { type: 'insert', id: 'b', values: { region: 'br', id: '2', name: null } },
      ]);
      expect(affected).toBe(2);
      expect((await readRows()).map((row) => row.map(String))).toEqual([
        ['br', '1', "O'Brien \\ \"x\"", 'none'],
        ['br', '2', 'null', 'none'],
      ]);
    });

    it('updates only the row of the composite key', async () => {
      await apply([{ type: 'update', key: { region: 'br', id: '1' }, values: { name: 'Ana', note: 'edited' } }]);
      const rows = await readRows();
      expect(rows[0].map(String)).toEqual(['br', '1', 'Ana', 'edited']);
      expect(rows[1].map(String)).toEqual(['br', '2', 'null', 'none']);
    });

    it('accepts an update that keeps the same value', async () => {
      await expect(apply([{ type: 'update', key: { region: 'br', id: '1' }, values: { name: 'Ana' } }])).resolves.toBe(1);
    });

    it('undoes everything when the second change fails', async () => {
      await expect(apply([
        { type: 'update', key: { region: 'br', id: '1' }, values: { name: 'must be undone' } },
        { type: 'update', key: { region: 'br', id: '2' }, values: { note: null } },
      ])).rejects.toThrow();
      expect(String((await readRows())[0][2])).toBe('Ana');
    });

    it('undoes everything when a row was removed by another session', async () => {
      await adapter.runQuery(engine.otherSessionDelete, 1);
      await expect(apply([
        { type: 'update', key: { region: 'br', id: '1' }, values: { name: 'must be undone' } },
        { type: 'update', key: { region: 'br', id: '2' }, values: { name: 'gone' } },
      ])).rejects.toThrow(/Nothing was saved/);
      expect(String((await readRows())[0][2])).toBe('Ana');
    });

    it('treats an injection attempt in a value as plain text', async () => {
      const attack = "'; DROP TABLE editing_test; --";
      await apply([{ type: 'update', key: { region: 'br', id: '1' }, values: { name: attack } }]);
      expect(String((await readRows())[0][2])).toBe(attack);
    });

    it('treats an injection attempt in a filter as plain text', async () => {
      const attack = "x' OR '1'='1";
      await expect(readRows([{ column: 'region', operator: 'equals', value: attack }])).resolves.toEqual([]);
      await expect(readRows([{ column: 'name', operator: 'contains', value: attack }])).resolves.toEqual([]);
    });

    it('filters, with wildcards taken literally', async () => {
      await apply([
        { type: 'insert', id: 'a', values: { region: 'us', id: '10', name: '100%' } },
        { type: 'insert', id: 'b', values: { region: 'us', id: '11', name: '100 percent' } },
      ]);
      const found = await readRows([{ column: 'name', operator: 'contains', value: '0%' }]);
      expect(found.map((row) => String(row[1]))).toEqual(['10']);
      const upperCase = await readRows([{ column: 'name', operator: 'startsWith', value: '100 PER' }]);
      expect(upperCase.map((row) => String(row[1]))).toEqual(['11']);
    });

    it('keeps the precision of big integer keys, so it edits the right row', async () => {
      await apply([
        { type: 'insert', id: 'a', values: { region: 'big', id: BIG_ID, name: 'one' } },
        { type: 'insert', id: 'b', values: { region: 'big', id: '9007199254740992', name: 'other' } },
      ]);
      const rows = await readRows([{ column: 'region', operator: 'equals', value: 'big' }]);
      expect(rows.map((row) => String(row[1]))).toEqual(['9007199254740992', BIG_ID]);

      await apply([{ type: 'update', key: { region: 'big', id: String(rows[1][1]) }, values: { name: 'edited' } }]);
      const after = await readRows([{ column: 'region', operator: 'equals', value: 'big' }]);
      expect(after.map((row) => String(row[2]))).toEqual(['other', 'edited']);
    });

    it('pages and counts', async () => {
      const { page, count } = buildTablePageQuery(table, engine.kind, { offset: 1, limit: 2, filters: [] });
      expect((await adapter.queryPage(page)).rows).toHaveLength(2);
      const total = await adapter.queryPage(count);
      expect(Number(total.rows[0][0])).toBeGreaterThan(2);
    });

    it('filters by an SQL expression, even with a comment in the middle', async () => {
      const { page, count } = buildTablePageQuery(table, engine.kind, { offset: 0, limit: 100, filters: [], whereExpression: "region = 'us' -- only one region" });
      const rows = (await adapter.queryPage(page)).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row[0] === 'us')).toBe(true);
      expect(Number((await adapter.queryPage(count)).rows[0][0])).toBe(rows.length);
    });

    it('combines an expression with column filters and their parameters', async () => {
      const { page } = buildTablePageQuery(table, engine.kind, {
        offset: 0,
        limit: 100,
        filters: [{ column: 'name', operator: 'equals', value: '100%' }],
        whereExpression: "region = 'us'",
      });
      expect((await adapter.queryPage(page)).rows.map((row) => String(row[1]))).toEqual(['10']);
    });

    it('does not run a write hidden in an expression, even if validation is skipped', async () => {
      const rowsBefore = (await readRows()).length;
      const smuggled = { sql: `SELECT * FROM editing_test WHERE (1 = 1); DELETE FROM editing_test`, params: [], preview: '' };
      await expect(adapter.queryPage(smuggled)).rejects.toThrow();
      expect(await readRows()).toHaveLength(rowsBefore);
    });

    it('does not run a second statement hidden in a change, without parameters', async () => {
      const rowsBefore = (await readRows()).length;
      const smuggled = { sql: `UPDATE editing_test SET note = 'x' WHERE 1 = 0; DELETE FROM editing_test`, params: [], preview: '' };
      await expect(adapter.applyStatements([smuggled])).rejects.toThrow();
      expect(await readRows()).toHaveLength(rowsBefore);
    });

    it('exports what is filtered, in batches, with its parameters', async () => {
      const statement = buildTableSelect(table, engine.kind, { filters: [{ column: 'region', operator: 'equals', value: 'big' }] });
      const batches: RowBatch[] = [];
      for await (const batch of adapter.streamRows(statement, 1)) {
        batches.push(batch);
      }
      expect(batches[0].columns).toEqual(['region', 'id', 'name', 'note']);
      expect(batches.flatMap((batch) => batch.rows).map((row) => String(row[0]))).toEqual(['big', 'big']);
    });

    it('deletes', async () => {
      await apply([{ type: 'delete', key: { region: 'us', id: '10' } }]);
      await expect(readRows([{ column: 'region', operator: 'equals', value: 'us' }])).resolves.toHaveLength(1);
    });

    it('refuses to save on a read-only session, at the database', async () => {
      const readOnly = createAdapter(toTarget(engine));
      await readOnly.connect();
      try {
        await readOnly.enforceReadOnly();
        await expect(readOnly.applyStatements(changes([{ type: 'update', key: { region: 'us', id: '11' }, values: { name: 'x' } }]))).rejects.toThrow(/read.only/i);
      } finally {
        await readOnly.dispose();
      }
    });
  });
});

describe('saving through an SSH tunnel', () => {
  const { DATADOCK_TEST_SSH_PORT: sshPort, DATADOCK_TEST_SSH_KEY: sshKey, DATADOCK_TEST_SSH_KNOWN_HOSTS: knownHosts, DATADOCK_TEST_POSTGRES_PORT: postgresPort } = process.env;

  it.skipIf(!sshPort || !postgresPort)('applies changes in a transaction', async () => {
    const engine = engines[0];
    const target: ConnectionTarget = {
      ...toTarget(engine, { host: '127.0.0.1', port: Number(sshPort), user: 'tunnel', identityFile: sshKey }),
      host: 'postgres',
      port: 5432,
    };
    const adapter = await openAdapter(target, { extraArgs: ['-F', 'none', '-o', `UserKnownHostsFile=${knownHosts}`] });
    await adapter.connect();
    try {
      await adapter.runQuery('DROP TABLE IF EXISTS tunnel_editing', 1);
      await adapter.runQuery('CREATE TABLE tunnel_editing (id INTEGER PRIMARY KEY, name TEXT)', 1);
      const table = (await adapter.readSchema('public')).tables.find((candidate) => candidate.name === 'tunnel_editing') as TableDefinition;

      const statements = buildRowChangeStatements(table, 'postgres', false, [{ type: 'insert', id: 'a', values: { id: '1', name: 'via ssh' } }]);
      await expect(adapter.applyStatements(statements)).resolves.toBe(1);

      const { page } = buildTablePageQuery(table, 'postgres', { offset: 0, limit: 10, filters: [] });
      expect((await adapter.queryPage(page)).rows).toEqual([['1', 'via ssh']]);
    } finally {
      await adapter.runQuery('DROP TABLE IF EXISTS tunnel_editing', 1);
      await adapter.dispose();
    }
  });
});
