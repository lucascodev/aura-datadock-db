import { describe, expect, it } from 'vitest';
import { DatabaseTargetRegistry } from '../../../../src/application/connections/databases/DatabaseTargetRegistry';
import { parseDatabaseTargetKey } from '../../../../src/application/connections/databases/parseDatabaseTargetKey';
import { toDatabaseTarget } from '../../../../src/application/connections/databases/toDatabaseTarget';
import type { ConnectionTarget } from '../../../../src/domain/connection/model/ConnectionTarget';

const server: ConnectionTarget = {
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
  database: 'app',
  credentialSource: 'container-env',
  isRemote: false,
  isReadOnly: true,
  tls: { mode: 'off' },
};

describe('toDatabaseTarget', () => {
  it('returns the server itself for the database it already opens', () => {
    expect(toDatabaseTarget(server, 'app')).toBe(server);
  });

  it('derives a target that keeps the credentials and protections of the server', () => {
    expect(toDatabaseTarget(server, 'reports')).toEqual({
      ...server,
      id: 'abc#reports',
      key: 'docker:db#reports',
      name: 'db/reports',
      parentId: 'abc',
      database: 'reports',
    });
  });
});

describe('parseDatabaseTargetKey', () => {
  it('splits the server key from the database', () => {
    expect(parseDatabaseTargetKey('docker:db#reports')).toEqual({ serverKey: 'docker:db', database: 'reports' });
  });

  it('keeps a database name that has the separator in it', () => {
    expect(parseDatabaseTargetKey('saved:1#a#b')).toEqual({ serverKey: 'saved:1', database: 'a#b' });
  });

  it('ignores keys of servers and keys without a database', () => {
    expect(parseDatabaseTargetKey('docker:db')).toBeUndefined();
    expect(parseDatabaseTargetKey('docker:db#')).toBeUndefined();
  });
});

describe('DatabaseTargetRegistry', () => {
  it('does not register the database the server already opens', () => {
    const registry = new DatabaseTargetRegistry();
    registry.register(server, 'app');
    expect(registry.ids()).toEqual([]);
  });

  it('lists the databases of each server', () => {
    const registry = new DatabaseTargetRegistry();
    const other = { ...server, id: 'xyz', key: 'docker:other' };
    registry.register(server, 'reports');
    registry.register(other, 'reports');
    expect(registry.idsOf('abc')).toEqual(['abc#reports']);
  });

  it('drops a database that became the default of its server', () => {
    const registry = new DatabaseTargetRegistry();
    registry.register(server, 'reports');
    registry.rebase([{ ...server, database: 'reports' }]);
    expect(registry.ids()).toEqual([]);
  });
});
