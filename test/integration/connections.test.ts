import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdapter } from '../../src/infrastructure/database/factory/createAdapter';
import { explainConnectionFailure } from '../../src/application/connections/guidance/explainConnectionFailure';
import { toConnectionTarget } from '../../src/application/connections/saved/toConnectionTarget';
import { ConnectionManager } from '../../src/application/connections/lifecycle/ConnectionManager';
import type { ConnectionTarget } from '../../src/domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../src/domain/database/DatabaseAdapter';
import type { RowBatch } from '../../src/domain/database/RowBatch';
import type { SavedConnection } from '../../src/domain/connection/SavedConnection';
import type { SshSettings } from '../../src/domain/connection/SshSettings';
import { openAdapter } from '../../src/infrastructure/ssh/openAdapter';
import { openSshTunnel, type SshTunnelOptions } from '../../src/infrastructure/ssh/SshTunnel';
import { TunneledAdapter } from '../../src/infrastructure/ssh/TunneledAdapter';

const {
  DATADOCK_TEST_POSTGRES_TLS_PORT: tlsPort,
  DATADOCK_TEST_MYSQL_PORT: mysqlPort,
  DATADOCK_TEST_TLS_CA: caFile,
  DATADOCK_TEST_SSH_PORT: sshPort,
  DATADOCK_TEST_SSH_KEY: sshKey,
  DATADOCK_TEST_SSH_KNOWN_HOSTS: knownHosts,
} = process.env;

const isConfigured = Boolean(tlsPort && sshPort && sshKey && knownHosts && caFile && mysqlPort);

function target(connection: Partial<SavedConnection>): ConnectionTarget {
  const saved: SavedConnection = {
    id: 'test',
    name: 'test',
    kind: 'postgres',
    host: 'localhost',
    port: Number(tlsPort),
    user: 'datadock',
    database: 'shop',
    tlsMode: 'off',
    isReadOnly: false,
    ...connection,
  };
  return { ...toConnectionTarget(saved), password: 'datadock' };
}

async function withConnection<T>(connectionTarget: ConnectionTarget, action: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> {
  const adapter = createAdapter(connectionTarget);
  await adapter.connect();
  try {
    return await action(adapter);
  } finally {
    await adapter.dispose();
  }
}

const usesTls = (adapter: DatabaseAdapter) =>
  adapter.runQuery('SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid = pg_catalog.pg_backend_pid()', 1).then((result) => result.rows[0][0]);

describe.skipIf(!isConfigured)('saved connections against real servers', () => {
  describe('Postgres TLS', () => {
    it('does not encrypt with off', async () => {
      await expect(withConnection(target({ tlsMode: 'off' }), usesTls)).resolves.toBe(false);
    });

    it('encrypts with required, accepting a self-signed certificate', async () => {
      await expect(withConnection(target({ tlsMode: 'required' }), usesTls)).resolves.toBe(true);
    });

    it('refuses the self-signed certificate with verified, and explains what to do', async () => {
      const failure = await withConnection(target({ tlsMode: 'verified' }), usesTls).catch((error: Error) => error.message);
      expect(failure).toMatch(/self.signed/i);
      expect(explainConnectionFailure(String(failure))).toContain('CA file');
    });

    it('accepts it with verified when the CA is informed', async () => {
      await expect(withConnection(target({ tlsMode: 'verified', caFile }), usesTls)).resolves.toBe(true);
    });

    describe('validating the real host, as a tunnel does by connecting to the loopback address', () => {
      const throughLoopback = (serverName: string): ConnectionTarget => ({ ...target({ host: '127.0.0.1' }), tls: { mode: 'verified', caFile, serverName } });

      it('accepts the certificate of the expected name', async () => {
        await expect(withConnection(throughLoopback('localhost'), usesTls)).resolves.toBe(true);
      });

      it('refuses a certificate issued for another name', async () => {
        await expect(withConnection(throughLoopback('other.example.com'), usesTls)).rejects.toThrow(/altnames|does not match/i);
      });
    });
  });

  describe('MySQL TLS', () => {
    const mysql = (tlsMode: SavedConnection['tlsMode']) =>
      target({ kind: 'mysql', host: '127.0.0.1', port: Number(mysqlPort), user: 'root', tlsMode });

    it('encrypts with required', async () => {
      const cipher = await withConnection(mysql('required'), (adapter) => adapter.runQuery(`SHOW SESSION STATUS LIKE 'Ssl_cipher'`, 1));
      expect(String(cipher.rows[0][1]).length).toBeGreaterThan(0);
    });

    it('refuses the self-signed certificate with verified', async () => {
      await expect(withConnection(mysql('verified'), usesTls)).rejects.toThrow(/self.signed|certificate/i);
    });
  });

  describe('SSH tunnel', () => {
    const ssh: SshSettings = { host: '127.0.0.1', port: Number(sshPort), user: 'tunnel', identityFile: sshKey };
    const options: SshTunnelOptions = { extraArgs: ['-F', 'none', '-o', `UserKnownHostsFile=${knownHosts}`] };

    const overTunnel: Record<'postgres' | 'mysql', ConnectionTarget> = {
      postgres: target({ host: 'postgres', port: 5432, ssh }),
      mysql: target({ kind: 'mysql', host: 'mysql', port: 3306, user: 'root', ssh }),
    };

    describe.each([
      { kind: 'postgres' as const, namespace: 'public', sleepSql: 'SELECT pg_sleep(30)' },
      { kind: 'mysql' as const, namespace: 'shop', sleepSql: 'SELECT SLEEP(30)' },
    ])('$kind', ({ kind, namespace, sleepSql }) => {
      let adapter: DatabaseAdapter;

      beforeAll(async () => {
        adapter = await openAdapter(overTunnel[kind], options);
        await adapter.connect();
      });

      afterAll(async () => {
        await adapter.dispose();
      });

      it('runs queries', async () => {
        const result = await adapter.runQuery('SELECT COUNT(*) FROM customers', 1);
        expect(Number(result.rows[0][0])).toBe(3);
      });

      it('reads the schema', async () => {
        const schema = await adapter.readSchema(namespace);
        expect(schema.tables.map((table) => table.name)).toContain('order_items');
      });

      it('streams a table on its own connection', async () => {
        const batches: RowBatch[] = [];
        for await (const batch of adapter.streamRows({ sql: 'SELECT * FROM customers', params: [], preview: '' }, 2)) {
          batches.push(batch);
        }
        expect(batches.flatMap((batch) => batch.rows)).toHaveLength(3);
      });

      it('cancels a slow query', async () => {
        const startedAt = Date.now();
        const running = adapter.runQuery(sleepSql, 1).catch((error: Error) => error);
        await new Promise((resolve) => setTimeout(resolve, 400));
        await adapter.cancelRunningQuery();
        await running;
        expect(Date.now() - startedAt).toBeLessThan(10_000);
      });
    });

    it('closes the ssh process when disposed', async () => {
      const tunnel = await openSshTunnel(ssh, { host: 'postgres', port: 5432 }, options);
      let closed = false;
      tunnel.onClose(() => {
        closed = true;
      });
      await tunnel.close();
      expect(closed).toBe(true);
    });

    it('reconnects on the next use after the tunnel drops', async () => {
      let opened = 0;
      const tunnels: Awaited<ReturnType<typeof openSshTunnel>>[] = [];
      const manager = new ConnectionManager(
        [{ kind: 'saved', discover: async () => [overTunnel.postgres] }],
        { get: async () => undefined },
        {
          readOnly: () => false,
          openAdapter: async (connectionTarget) => {
            opened++;
            const tunnel = await openSshTunnel(ssh, { host: 'postgres', port: 5432 }, options);
            tunnels.push(tunnel);
            return new TunneledAdapter(createAdapter({ ...connectionTarget, host: '127.0.0.1', port: tunnel.localPort }), tunnel);
          },
        },
      );
      await manager.refresh();

      const first = await manager.getAdapter('test');
      expect((await first.runQuery('SELECT 1 AS one', 1)).rows).toEqual([[1]]);

      await tunnels[0].close();
      const second = await manager.getAdapter('test');

      expect(second).not.toBe(first);
      expect(opened).toBe(2);
      expect((await second.runQuery('SELECT 2 AS two', 1)).rows).toEqual([[2]]);
      await manager.closeAll();
    });

    it('enforces read-only on the database session, through the tunnel', async () => {
      const readOnly = await openAdapter(target({ host: 'postgres', port: 5432, ssh, isReadOnly: true }), options);
      await readOnly.connect();
      try {
        await readOnly.enforceReadOnly();
        await expect(readOnly.runQuery(`INSERT INTO audit_log (entry) VALUES ('x')`, 1)).rejects.toThrow(/read.only/i);
      } finally {
        await readOnly.dispose();
      }
    });

    describe('failures', () => {
      let workDir: string;

      beforeAll(() => {
        workDir = mkdtempSync(join(tmpdir(), 'datadock-ssh-'));
      });

      afterAll(() => {
        rmSync(workDir, { recursive: true, force: true });
      });

      it('explains a key the server refuses', async () => {
        const otherKey = join(workDir, 'other_key');
        spawnSync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-q', '-f', otherKey]);
        await expect(openSshTunnel({ ...ssh, identityFile: otherKey }, { host: 'postgres', port: 5432 }, options)).rejects.toThrow(/refused the key/);
      });

      it('refuses an unknown host instead of accepting its key', async () => {
        const emptyKnownHosts = join(workDir, 'empty_known_hosts');
        writeFileSync(emptyKnownHosts, '');
        const strict: SshTunnelOptions = { extraArgs: ['-F', 'none', '-o', `UserKnownHostsFile=${emptyKnownHosts}`, '-o', 'GlobalKnownHostsFile=none'] };
        await expect(openSshTunnel(ssh, { host: 'postgres', port: 5432 }, strict)).rejects.toThrow(/could not be verified/);
      });

      it('explains a server that cannot be reached', async () => {
        await expect(openSshTunnel({ ...ssh, port: 1 }, { host: 'postgres', port: 5432 }, options)).rejects.toThrow(/could not be reached/);
      });
    });
  });
});
