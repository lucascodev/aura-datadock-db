import { describe, expect, it } from 'vitest';
import { toMysqlSsl } from '../../../../src/infrastructure/database/mysql/toMysqlSsl';
import { toPostgresSsl } from '../../../../src/infrastructure/database/postgres/toPostgresSsl';
import type { ConnectionInput } from '../../../../src/application/connections/model/ConnectionInput';
import { explainConnectionFailure } from '../../../../src/application/connections/guidance/explainConnectionFailure';
import { isLocalHost } from '../../../../src/application/connections/guidance/isLocalHost';
import { parseConnectionString } from '../../../../src/application/connections/saved/parseConnectionString';
import { SavedConnections } from '../../../../src/application/connections/saved/SavedConnections';
import type { SavedConnectionStore } from '../../../../src/application/connections/ports/SavedConnectionStore';
import { suggestProtection } from '../../../../src/application/connections/guidance/suggestProtection';
import { toConnectionTarget } from '../../../../src/application/connections/saved/toConnectionTarget';
import { validateConnectionInput } from '../../../../src/application/connections/saved/validateConnectionInput';
import { decideQueryGuard } from '../../../../src/application/query/execution/decideQueryGuard';
import type { SavedConnection } from '../../../../src/domain/connection/model/SavedConnection';

const validInput: ConnectionInput = {
  name: 'Staging',
  kind: 'postgres',
  host: 'db.example.com',
  port: '5432',
  user: 'app',
  database: '',
  tlsMode: 'verified',
  caFile: '',
  isReadOnly: true,
  usesSsh: false,
  sshHost: '',
  sshPort: '',
  sshUser: '',
  sshIdentityFile: '',
  sshJumpHost: '',
};

const savedConnection: SavedConnection = {
  id: 'one',
  name: 'Staging',
  kind: 'postgres',
  host: 'db.example.com',
  port: 5432,
  user: 'app',
  tlsMode: 'verified',
  isReadOnly: true,
};

function errorsOf(input: Partial<ConnectionInput>, takenNames: readonly string[] = []) {
  const validation = validateConnectionInput({ ...validInput, ...input }, takenNames);
  return validation.isValid ? {} : validation.errors;
}

describe('validateConnectionInput', () => {
  it('accepts a valid connection and normalizes it', () => {
    const validation = validateConnectionInput({ ...validInput, name: '  Staging ', port: ' 5433 ' }, []);
    expect(validation).toMatchObject({ isValid: true, connection: { name: 'Staging', port: 5433, database: undefined, ssh: undefined } });
  });

  it.each([
    ['name', { name: ' ' }],
    ['host', { host: '' }],
    ['port', { port: '' }],
    ['port', { port: '70000' }],
    ['port', { port: '12a' }],
    ['user', { user: '' }],
  ])('rejects an invalid %s', (field, input) => {
    expect(errorsOf(input)).toHaveProperty(field);
  });

  it('rejects a name already in use, ignoring case', () => {
    expect(errorsOf({ name: 'staging' }, ['STAGING']).name).toContain('already');
  });

  it.each(['-oProxyCommand=calc', 'host with space'])('rejects the unsafe host %s', (host) => {
    expect(errorsOf({ host }).host).toBeDefined();
  });

  it('rejects a user that would be read as an option', () => {
    expect(errorsOf({ user: '-oProxyCommand=calc' }).user).toBeDefined();
  });

  describe('with SSH', () => {
    const ssh = { usesSsh: true, sshHost: 'bastion' };

    it('builds the settings, leaving out what is empty', () => {
      const validation = validateConnectionInput({ ...validInput, ...ssh, sshPort: '2222', sshUser: 'deploy' }, []);
      expect(validation).toMatchObject({ isValid: true, connection: { ssh: { host: 'bastion', port: 2222, user: 'deploy', identityFile: undefined, jumpHost: undefined } } });
    });

    it('requires the host only when SSH is on', () => {
      expect(errorsOf({ usesSsh: true }).sshHost).toBeDefined();
      expect(errorsOf({ usesSsh: false }).sshHost).toBeUndefined();
    });

    it.each([
      ['sshHost', { sshHost: '-oProxyCommand=calc' }],
      ['sshUser', { sshUser: '-lroot' }],
      ['sshJumpHost', { sshJumpHost: '-oProxyCommand=calc' }],
      ['sshIdentityFile', { sshIdentityFile: '-oProxyCommand=calc' }],
      ['sshPort', { sshPort: '0' }],
    ])('rejects an unsafe %s', (field, input) => {
      expect(errorsOf({ ...ssh, ...input })).toHaveProperty(field);
    });
  });

  it('keeps the CA file only when the certificate is validated', () => {
    const required = validateConnectionInput({ ...validInput, tlsMode: 'required', caFile: 'ca.pem' }, []);
    const verified = validateConnectionInput({ ...validInput, tlsMode: 'verified', caFile: 'ca.pem' }, []);
    expect(required).toMatchObject({ connection: { caFile: undefined } });
    expect(verified).toMatchObject({ connection: { caFile: 'ca.pem' } });
  });
});

describe('parseConnectionString', () => {
  it('reads a Postgres URL', () => {
    expect(parseConnectionString('postgres://app:s3cret@db.example.com:6543/shop?sslmode=require')).toEqual({
      kind: 'postgres',
      host: 'db.example.com',
      port: '6543',
      user: 'app',
      password: 's3cret',
      database: 'shop',
      tlsMode: 'required',
    });
  });

  it.each([
    ['postgresql://u@h/d', 'postgres', '5432'],
    ['mysql://u@h/d', 'mysql', '3306'],
    ['mariadb://u@h/d', 'mariadb', '3306'],
  ])('understands %s and uses the default port', (text, kind, port) => {
    expect(parseConnectionString(text)).toMatchObject({ kind, port });
  });

  it('decodes special characters in the credentials', () => {
    expect(parseConnectionString('postgres://us%40er:p%40ss%2Fword@h/d')).toMatchObject({ user: 'us@er', password: 'p@ss/word' });
  });

  it('reads IPv6 hosts without brackets', () => {
    expect(parseConnectionString('postgres://u@[::1]:5432/d')?.host).toBe('::1');
  });

  it.each([
    ['disable', 'off'],
    ['verify-full', 'verified'],
    ['verify-ca', 'verified'],
    ['prefer', 'required'],
  ])('maps sslmode=%s to %s', (mode, expected) => {
    expect(parseConnectionString(`postgres://u@h/d?sslmode=${mode}`)?.tlsMode).toBe(expected);
  });

  it('leaves TLS undefined when the string says nothing', () => {
    expect(parseConnectionString('postgres://u@h/d')?.tlsMode).toBeUndefined();
  });

  it.each(['not a url', 'http://example.com', 'sqlite://file', ''])('rejects %s', (text) => {
    expect(parseConnectionString(text)).toBeUndefined();
  });
});

describe('isLocalHost', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '::1', '[::1]', '0.0.0.0'])('treats %s as local', (host) => {
    expect(isLocalHost(host)).toBe(true);
  });

  it.each(['db.example.com', '10.0.0.5', '192.168.1.10', 'localhost.example.com', '127.0.0.1.example.com'])('treats %s as remote', (host) => {
    expect(isLocalHost(host)).toBe(false);
  });
});

describe('suggestProtection', () => {
  it('does not suggest protection before a host is typed', () => {
    expect(suggestProtection('  ', false)).toEqual({ tlsMode: 'off', isReadOnly: false });
  });

  it('asks nothing of a local database', () => {
    expect(suggestProtection('localhost', false)).toEqual({ tlsMode: 'off', isReadOnly: false });
  });

  it('validates certificates and blocks writes on a remote database', () => {
    expect(suggestProtection('db.example.com', false)).toEqual({ tlsMode: 'verified', isReadOnly: true });
  });

  it('relies on the tunnel for encryption, but still blocks writes', () => {
    expect(suggestProtection('localhost', true)).toEqual({ tlsMode: 'off', isReadOnly: true });
  });
});

describe('toConnectionTarget', () => {
  it('marks a remote host', () => {
    expect(toConnectionTarget(savedConnection)).toMatchObject({ source: 'saved', key: 'saved:one', isRemote: true, isReadOnly: true, tls: { mode: 'verified' } });
  });

  it('marks a local host as not remote', () => {
    expect(toConnectionTarget({ ...savedConnection, host: 'localhost' }).isRemote).toBe(false);
  });

  it('treats a local host behind SSH as remote', () => {
    expect(toConnectionTarget({ ...savedConnection, host: 'localhost', ssh: { host: 'bastion' } }).isRemote).toBe(true);
  });

  it('never carries a password', () => {
    expect(toConnectionTarget(savedConnection).password).toBeUndefined();
  });
});

describe('SavedConnections', () => {
  function createStore(initial: readonly unknown[] = []): SavedConnectionStore & { current: readonly unknown[] } {
    const store = {
      current: initial,
      read: () => store.current,
      write: async (connections: readonly SavedConnection[]) => {
        store.current = connections;
      },
    };
    return store;
  }

  it('adds, replaces and removes', async () => {
    const connections = new SavedConnections(createStore());
    await connections.save(savedConnection);
    await connections.save({ ...savedConnection, name: 'Renamed' });
    expect(connections.list().map((item) => item.name)).toEqual(['Renamed']);

    await connections.remove('one');
    expect(connections.list()).toEqual([]);
  });

  it('discovers targets sorted by name', async () => {
    const store = createStore([{ ...savedConnection, id: '2', name: 'b' }, { ...savedConnection, id: '1', name: 'a' }]);
    const targets = await new SavedConnections(store).discover();
    expect(targets.map((target) => target.name)).toEqual(['a', 'b']);
  });

  it.each([
    ['a value that is not an object', 'text'],
    ['a missing host', { ...savedConnection, host: undefined }],
    ['a host that would be read as an option', { ...savedConnection, host: '-oProxyCommand=calc' }],
    ['an unknown engine', { ...savedConnection, kind: 'oracle' }],
    ['an unknown TLS mode', { ...savedConnection, tlsMode: 'maybe' }],
  ])('ignores %s edited by hand in the settings', async (_label, entry) => {
    expect(await new SavedConnections(createStore([entry])).discover()).toEqual([]);
  });
});

describe('explainConnectionFailure', () => {
  it.each(['self-signed certificate', 'unable to verify the first certificate', "Hostname/IP does not match certificate's altnames"])(
    'suggests a CA file for "%s"',
    (message) => {
      const explained = explainConnectionFailure(message);
      expect(explained).toContain(message);
      expect(explained).toContain('CA file');
    },
  );

  it.each(['The server does not support SSL connections', 'Server does not support secure connection'])('suggests another mode for "%s"', (message) => {
    expect(explainConnectionFailure(message)).toContain('does not accept TLS');
  });

  it('explains a server that requires TLS', () => {
    expect(explainConnectionFailure('no pg_hba.conf entry for host "1.2.3.4", user "a", database "b", no encryption')).toContain('requires TLS');
  });

  it('leaves other failures alone', () => {
    expect(explainConnectionFailure('password authentication failed')).toBe('password authentication failed');
  });
});

describe('TLS options', () => {
  it('maps off', () => {
    expect(toPostgresSsl({ mode: 'off' })).toBe(false);
    expect(toMysqlSsl({ mode: 'off' })).toBeUndefined();
  });

  it('encrypts without validating in required', () => {
    expect(toPostgresSsl({ mode: 'required' })).toEqual({ rejectUnauthorized: false });
    expect(toMysqlSsl({ mode: 'required' })).toEqual({ rejectUnauthorized: false });
  });

  it('validates in verified', () => {
    expect(toPostgresSsl({ mode: 'verified' })).toMatchObject({ rejectUnauthorized: true });
    expect(toMysqlSsl({ mode: 'verified' })).toMatchObject({ rejectUnauthorized: true, verifyIdentity: true });
  });

  it('validates against the real host through a tunnel on Postgres', () => {
    expect(toPostgresSsl({ mode: 'verified', serverName: 'db.internal' })).toMatchObject({ servername: 'db.internal' });
  });

  it('checks only the certificate chain through a tunnel on MySQL, which cannot override the name', () => {
    expect(toMysqlSsl({ mode: 'verified', serverName: 'db.internal' })).toMatchObject({ rejectUnauthorized: true, verifyIdentity: false });
  });

  it('fails clearly when the CA file does not exist', () => {
    expect(() => toPostgresSsl({ mode: 'verified', caFile: 'does-not-exist.pem' })).toThrow(/does-not-exist/);
  });
});

describe('decideQueryGuard', () => {
  const local = { isReadOnly: false, isRemote: false, confirmsDestructive: true };

  it('always allows reads', () => {
    expect(decideQueryGuard('read', { ...local, isReadOnly: true, isRemote: true })).toBe('allow');
  });

  it('blocks every write on a read-only connection', () => {
    expect(decideQueryGuard('write', { ...local, isReadOnly: true })).toBe('block');
    expect(decideQueryGuard('destructive', { ...local, isReadOnly: true })).toBe('block');
  });

  it('confirms only destructive statements on a local database', () => {
    expect(decideQueryGuard('write', local)).toBe('allow');
    expect(decideQueryGuard('destructive', local)).toBe('confirm');
  });

  it('respects the setting that turns the confirmation off on a local database', () => {
    expect(decideQueryGuard('destructive', { ...local, confirmsDestructive: false })).toBe('allow');
  });

  it('confirms every write on a remote database, even with that setting off', () => {
    const remote = { ...local, isRemote: true, confirmsDestructive: false };
    expect(decideQueryGuard('write', remote)).toBe('confirm');
    expect(decideQueryGuard('destructive', remote)).toBe('confirm');
  });
});
