import { describe, expect, it, vi } from 'vitest';
import { ConnectionManager } from '../../../../src/application/connections/lifecycle/ConnectionManager';
import { MissingPasswordError } from '../../../../src/application/connections/errors/MissingPasswordError';
import type { ConnectionSource } from '../../../../src/domain/connection/ports/ConnectionSource';
import type { ConnectionTarget } from '../../../../src/domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../src/domain/database/ports/DatabaseAdapter';

const target: ConnectionTarget = {
  id: 'abc',
  key: 'docker:db',
  name: 'db',
  detail: 'postgres:17',
  source: 'docker',
  kind: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  user: 'u',
  password: 'p',
  credentialSource: 'container-env',
  isRemote: false,
  isReadOnly: false,
  tls: { mode: 'off' },
};

const savedTarget: ConnectionTarget = { ...target, id: 'saved-1', key: 'saved:saved-1', name: 'prod', source: 'saved', isRemote: true };

function createFakeAdapter(): { adapter: DatabaseAdapter; disconnect: () => void } {
  let listener: (() => void) | undefined;
  const adapter = {
    connect: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    enforceReadOnly: vi.fn().mockResolvedValue(undefined),
    onDisconnect: (callback: () => void) => {
      listener = callback;
    },
  } as unknown as DatabaseAdapter;
  return { adapter, disconnect: () => listener?.() };
}

function source(kind: ConnectionSource['kind'], discover: () => Promise<ConnectionTarget[]>): ConnectionSource {
  return { kind, discover };
}

async function createManager(
  targets: readonly ConnectionTarget[],
  fakes: ReturnType<typeof createFakeAdapter>[],
  readOnly: (candidate: ConnectionTarget) => boolean = () => false,
) {
  let created = 0;
  const manager = new ConnectionManager([source('docker', async () => [...targets])], { get: async () => undefined }, {
    readOnly,
    openAdapter: () => fakes[created++].adapter,
  });
  await manager.refresh();
  return manager;
}

describe('ConnectionManager', () => {
  it('reuses the open adapter', async () => {
    const fake = createFakeAdapter();
    const manager = await createManager([target], [fake]);
    expect(await manager.getAdapter('abc')).toBe(await manager.getAdapter('abc'));
    expect(fake.adapter.connect).toHaveBeenCalledTimes(1);
  });

  it('reconnects on the next use after the connection drops', async () => {
    const first = createFakeAdapter();
    const second = createFakeAdapter();
    const manager = await createManager([target], [first, second]);

    expect(await manager.getAdapter('abc')).toBe(first.adapter);
    first.disconnect();
    expect(await manager.getAdapter('abc')).toBe(second.adapter);
  });

  it('ignores a late disconnect from an adapter that was already replaced', async () => {
    const first = createFakeAdapter();
    const second = createFakeAdapter();
    const manager = await createManager([target], [first, second]);

    await manager.getAdapter('abc');
    await manager.close('abc');
    await manager.getAdapter('abc');
    first.disconnect();

    expect(await manager.getAdapter('abc')).toBe(second.adapter);
  });

  it('enforces read-only on every new connection', async () => {
    const first = createFakeAdapter();
    const second = createFakeAdapter();
    const manager = await createManager([target], [first, second], () => true);

    await manager.getAdapter('abc');
    first.disconnect();
    await manager.getAdapter('abc');

    expect(first.adapter.enforceReadOnly).toHaveBeenCalledTimes(1);
    expect(second.adapter.enforceReadOnly).toHaveBeenCalledTimes(1);
  });

  it('decides read-only for each connection', async () => {
    const writable = createFakeAdapter();
    const readOnly = createFakeAdapter();
    const manager = await createManager([target, savedTarget], [writable, readOnly], (candidate) => candidate.source === 'saved');

    await manager.getAdapter(target.id);
    await manager.getAdapter(savedTarget.id);

    expect(writable.adapter.enforceReadOnly).not.toHaveBeenCalled();
    expect(readOnly.adapter.enforceReadOnly).toHaveBeenCalledTimes(1);
  });

  it('does not keep a connection that failed to open, and releases it', async () => {
    const failing = createFakeAdapter();
    vi.mocked(failing.adapter.connect).mockRejectedValue(new Error('refused'));
    const working = createFakeAdapter();
    const manager = await createManager([target], [failing, working]);

    await expect(manager.getAdapter('abc')).rejects.toThrow('refused');
    expect(failing.adapter.dispose).toHaveBeenCalledTimes(1);
    expect(await manager.getAdapter('abc')).toBe(working.adapter);
  });

  it('adds guidance to certificate failures', async () => {
    const failing = createFakeAdapter();
    vi.mocked(failing.adapter.connect).mockRejectedValue(new Error('self-signed certificate'));
    const manager = await createManager([target], [failing]);
    await expect(manager.getAdapter('abc')).rejects.toThrow(/CA file/);
  });

  it('asks for the password when the connection has none', async () => {
    const manager = await createManager([{ ...target, password: undefined }], []);
    await expect(manager.getAdapter('abc')).rejects.toBeInstanceOf(MissingPasswordError);
  });

  describe('sources', () => {
    function createFromSources(sources: readonly ConnectionSource[]) {
      return new ConnectionManager(sources, { get: async () => undefined }, { readOnly: () => false, openAdapter: () => createFakeAdapter().adapter });
    }

    it('keeps saved connections when Docker is not available', async () => {
      const manager = createFromSources([
        source('saved', async () => [savedTarget]),
        source('docker', async () => {
          throw new Error('connect ENOENT docker_engine');
        }),
      ]);

      const targets = await manager.refresh();

      expect(targets.map((candidate) => candidate.name)).toEqual(['prod']);
      expect(manager.getSourceError('docker')).toContain('ENOENT');
      expect(manager.getSourceError('saved')).toBeUndefined();
    });

    it('clears the error when Docker comes back', async () => {
      let isDockerUp = false;
      const manager = createFromSources([
        source('docker', async () => {
          if (!isDockerUp) {
            throw new Error('down');
          }
          return [target];
        }),
      ]);

      await manager.refresh();
      isDockerUp = true;
      await manager.refresh();

      expect(manager.getSourceError('docker')).toBeUndefined();
      expect(manager.getTargets()).toHaveLength(1);
    });

    it('selects a Docker connection as active automatically', async () => {
      const manager = createFromSources([source('saved', async () => [savedTarget]), source('docker', async () => [target])]);
      await manager.refresh();
      expect(manager.activeTarget?.name).toBe('db');
    });

    it('never makes a saved connection active on its own', async () => {
      const manager = createFromSources([source('saved', async () => [savedTarget])]);
      await manager.refresh();
      expect(manager.activeTarget).toBeUndefined();
    });

    it('keeps a saved connection active once chosen', async () => {
      const manager = createFromSources([source('saved', async () => [savedTarget]), source('docker', async () => [target])]);
      await manager.refresh();
      manager.setActive(savedTarget.id);
      await manager.refresh();
      expect(manager.activeTarget?.name).toBe('prod');
    });

    it('finds connections by their stable key', async () => {
      const sameName = { ...savedTarget, name: 'db' };
      const manager = createFromSources([source('saved', async () => [sameName]), source('docker', async () => [target])]);
      await manager.refresh();
      expect(manager.findByKey('saved:saved-1')?.source).toBe('saved');
      expect(manager.findByKey('docker:db')?.source).toBe('docker');
    });
  });

  describe('databases of a server', () => {
    const server: ConnectionTarget = { ...target, database: 'app' };

    function createWithSource(discover: () => Promise<ConnectionTarget[]>, openAdapter = () => createFakeAdapter().adapter) {
      return new ConnectionManager([source('docker', discover)], { get: async () => undefined }, { readOnly: () => false, openAdapter });
    }

    it('reuses the server connection for its own database', async () => {
      const manager = await createManager([server], []);
      expect(manager.resolveDatabaseTarget(server.id, 'app')).toBe(manager.getTarget(server.id));
    });

    it('opens another database on its own connection', async () => {
      const serverAdapter = createFakeAdapter();
      const databaseAdapter = createFakeAdapter();
      const openAdapter = vi.fn().mockReturnValueOnce(serverAdapter.adapter).mockReturnValueOnce(databaseAdapter.adapter);
      const manager = createWithSource(async () => [server], openAdapter);
      await manager.refresh();

      const reports = manager.resolveDatabaseTarget(server.id, 'reports');
      await manager.getAdapter(server.id);

      expect(reports).toMatchObject({ database: 'reports', parentId: server.id, name: 'db/reports' });
      expect(await manager.getAdapter(reports!.id)).toBe(databaseAdapter.adapter);
      expect(openAdapter).toHaveBeenLastCalledWith(expect.objectContaining({ database: 'reports', password: 'p' }));
    });

    it('can make a database the active connection', async () => {
      const manager = await createManager([server], []);
      manager.setActive(manager.resolveDatabaseTarget(server.id, 'reports')!.id);
      expect(manager.activeTarget?.database).toBe('reports');
    });

    it('keeps the active database across refreshes and follows the server password', async () => {
      let password = 'old';
      const manager = createWithSource(async () => [{ ...server, password }]);
      await manager.refresh();
      manager.setActive(manager.resolveDatabaseTarget(server.id, 'reports')!.id);

      password = 'new';
      await manager.refresh();

      expect(manager.activeTarget).toMatchObject({ database: 'reports', password: 'new' });
    });

    it('forgets the databases of a server that is gone', async () => {
      let targets = [server];
      const manager = createWithSource(async () => targets);
      await manager.refresh();
      const reports = manager.resolveDatabaseTarget(server.id, 'reports')!;

      targets = [];
      await manager.refresh();

      expect(manager.getTarget(reports.id)).toBeUndefined();
    });

    it('finds a database by its key even before it was opened in this session', async () => {
      const manager = await createManager([server], []);
      expect(manager.findByKey('docker:db#reports')).toMatchObject({ database: 'reports', parentId: server.id });
      expect(manager.findByKey('docker:other#reports')).toBeUndefined();
    });

    it('closes the databases together with their server', async () => {
      const serverAdapter = createFakeAdapter();
      const databaseAdapter = createFakeAdapter();
      const manager = await createManager([server], [serverAdapter, databaseAdapter]);
      await manager.getAdapter(server.id);
      const reports = manager.resolveDatabaseTarget(server.id, 'reports')!;
      await manager.getAdapter(reports.id);

      const closed = await manager.closeWithDatabases(server.id);

      expect(closed).toEqual([server.id, reports.id]);
      expect(serverAdapter.adapter.dispose).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.adapter.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('change notifications', () => {
    it('notifies only when something changed', async () => {
      let targets = [target];
      const manager = new ConnectionManager([source('docker', async () => targets)], { get: async () => undefined }, { readOnly: () => false, openAdapter: () => createFakeAdapter().adapter });
      const listener = vi.fn();
      manager.onDidChange(listener);

      await manager.refresh();
      await manager.refresh();
      expect(listener).toHaveBeenCalledTimes(1);

      targets = [target, savedTarget];
      await manager.refresh();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('does not put the password in what it compares', async () => {
      let password = 'one';
      const manager = new ConnectionManager(
        [source('docker', async () => [{ ...target, password }])],
        { get: async () => undefined },
        { readOnly: () => false, openAdapter: () => createFakeAdapter().adapter },
      );
      const listener = vi.fn();
      manager.onDidChange(listener);

      await manager.refresh();
      password = 'two';
      await manager.refresh();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
