import { describe, expect, it } from 'vitest';
import { toConnectionOpenedEvent } from '../../../../src/application/telemetry/events/toConnectionOpenedEvent';
import type { ConnectionTarget } from '../../../../src/domain/connection/model/ConnectionTarget';

const remoteTarget: ConnectionTarget = {
  id: 'saved-1',
  key: 'saved:saved-1',
  name: 'billing-prod',
  detail: 'db.internal.example.com:5432',
  source: 'saved',
  kind: 'postgres',
  host: 'db.internal.example.com',
  port: 5432,
  user: 'billing_admin',
  password: 'hunter2',
  database: 'billing',
  credentialSource: 'secret-storage',
  isRemote: true,
  isReadOnly: false,
  tls: { mode: 'verified', caFile: '/home/dev/ca.pem', serverName: 'db.internal.example.com' },
  ssh: { host: 'bastion.example.com', user: 'dev', identityFile: '/home/dev/.ssh/id_ed25519' },
};

describe('toConnectionOpenedEvent', () => {
  it('describes the connection by type and origin only', () => {
    expect(toConnectionOpenedEvent(remoteTarget)).toEqual({
      name: 'connection.opened',
      driver: 'postgres',
      source: 'saved',
      ssh: true,
      remote: true,
    });
  });

  it('reports a direct connection without a tunnel', () => {
    const { ssh: _ssh, ...directTarget } = remoteTarget;

    expect(toConnectionOpenedEvent({ ...directTarget, source: 'docker', isRemote: false })).toMatchObject({ source: 'docker', ssh: false, remote: false });
  });

  it('never carries a value that identifies the server, the user or the data', () => {
    const serialized = JSON.stringify(toConnectionOpenedEvent(remoteTarget));
    const identifyingValues = ['billing', 'db.internal', 'bastion', 'hunter2', '5432', '/home/dev', 'saved-1'];

    identifyingValues.forEach((value) => expect(serialized).not.toContain(value));
  });
});
