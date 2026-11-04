import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ConnectionTarget } from '../../src/domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../src/domain/database/DatabaseAdapter';
import { createAdapter } from '../../src/infrastructure/database/factory/createAdapter';

const POSTGRES_PORT = process.env.DATADOCK_TEST_POSTGRES_PORT;
const MYSQL_PORT = process.env.DATADOCK_TEST_MYSQL_PORT;

function toTarget(kind: 'postgres' | 'mysql', port: string, user: string): ConnectionTarget {
  return {
    id: `read-only-${kind}`,
    key: `read-only-${kind}`,
    name: `read-only-${kind}`,
    detail: kind,
    source: 'saved',
    kind,
    host: '127.0.0.1',
    port: Number(port),
    user,
    password: 'datadock',
    database: 'shop',
    credentialSource: 'secret-storage',
    isRemote: false,
    isReadOnly: true,
    tls: { mode: 'off' },
  };
}

async function open(target: ConnectionTarget, isReadOnly: boolean): Promise<DatabaseAdapter> {
  const adapter = createAdapter(target);
  await adapter.connect();
  if (isReadOnly) {
    await adapter.enforceReadOnly();
  }
  return adapter;
}

describe.skipIf(!POSTGRES_PORT)('read-only session on Postgres', () => {
  const target = toTarget('postgres', POSTGRES_PORT ?? '', 'datadock');
  let writer: DatabaseAdapter;
  let reader: DatabaseAdapter;

  beforeAll(async () => {
    writer = await open(target, false);
    reader = await open(target, true);
    await writer.runQuery('CREATE TABLE IF NOT EXISTS read_only_probe (id int PRIMARY KEY, note text)', 1);
    await writer.runQuery('TRUNCATE read_only_probe', 1);
    await writer.runQuery("INSERT INTO read_only_probe VALUES (1, 'original')", 1);
    await writer.runQuery("CREATE OR REPLACE FUNCTION read_only_probe_write() RETURNS int LANGUAGE sql AS $$ UPDATE read_only_probe SET note = 'changed' RETURNING 1 $$", 1);
  });

  afterAll(async () => {
    await writer.runQuery('DROP FUNCTION IF EXISTS read_only_probe_write()', 1);
    await writer.runQuery('DROP TABLE IF EXISTS read_only_probe', 1);
    await reader.dispose();
    await writer.dispose();
  });

  async function storedNote(): Promise<unknown> {
    return (await writer.runQuery('SELECT note FROM read_only_probe', 1)).rows[0][0];
  }

  it('refuses a function that writes', async () => {
    await expect(reader.runQuery('SELECT read_only_probe_write()', 1)).rejects.toThrow(/read-only/);
    expect(await storedNote()).toBe('original');
  });

  it('stays read-only after a statement tries to turn it off', async () => {
    await reader.runQuery("SELECT set_config('default_transaction_read_only', 'off', false)", 1);
    const setting = await reader.runQuery('SHOW default_transaction_read_only', 1);
    expect(setting.rows[0][0]).toBe('on');
    await expect(reader.runQuery('SELECT read_only_probe_write()', 1)).rejects.toThrow(/read-only/);
    await expect(reader.runQuery("SELECT set_config('transaction_read_only', 'off', true), read_only_probe_write()", 1)).rejects.toThrow();
    expect(await storedNote()).toBe('original');
  });

  it('applies to pages and exports too', async () => {
    const statement = { sql: 'SELECT read_only_probe_write()', params: [], preview: 'probe' };
    await expect(reader.queryPage(statement)).rejects.toThrow(/read-only/);
    const consume = async () => {
      for await (const batch of reader.streamRows(statement, 10)) {
        expect(batch).toBeDefined();
      }
    };
    await expect(consume()).rejects.toThrow(/read-only/);
    expect(await storedNote()).toBe('original');
  });

  it('keeps reading after a failed statement, and with queries at the same time', async () => {
    await expect(reader.runQuery('SELECT * FROM table_that_does_not_exist', 1)).rejects.toThrow();
    const results = await Promise.all([1, 2, 3, 4, 5].map((value) => reader.runQuery(`SELECT ${value} AS value`, 1)));
    expect(results.map((result) => Number(result.rows[0][0]))).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not touch a connection that can write', async () => {
    await writer.runQuery('SELECT read_only_probe_write()', 1);
    expect(await storedNote()).toBe('changed');
    await writer.runQuery("UPDATE read_only_probe SET note = 'original'", 1);
  });
});

describe.skipIf(!MYSQL_PORT)('read-only session on MySQL', () => {
  it('applies to exports too', async () => {
    const target = toTarget('mysql', MYSQL_PORT ?? '', 'root');
    const writer = await open(target, false);
    const reader = await open(target, true);
    try {
      await writer.runQuery('CREATE TABLE IF NOT EXISTS read_only_probe (id int PRIMARY KEY)', 1);
      const consume = async () => {
        for await (const batch of reader.streamRows({ sql: 'INSERT INTO read_only_probe VALUES (1)', params: [], preview: 'probe' }, 10)) {
          expect(batch).toBeDefined();
        }
      };
      await expect(consume()).rejects.toThrow(/READ ONLY/i);
      expect((await writer.runQuery('SELECT count(*) FROM read_only_probe', 1)).rows[0][0]).toBe(0);
    } finally {
      await writer.runQuery('DROP TABLE IF EXISTS read_only_probe', 1);
      await reader.dispose();
      await writer.dispose();
    }
  });
});
