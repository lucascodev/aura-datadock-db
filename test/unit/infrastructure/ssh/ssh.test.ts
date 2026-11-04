import { describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter } from '../../../../src/domain/database/DatabaseAdapter';
import { buildSshArgs } from '../../../../src/infrastructure/ssh/buildSshArgs';
import { explainSshFailure } from '../../../../src/infrastructure/ssh/explainSshFailure';
import { openSshTunnel } from '../../../../src/infrastructure/ssh/openSshTunnel';
import type { SshTunnel } from '../../../../src/infrastructure/ssh/SshTunnel';
import { TunneledAdapter } from '../../../../src/infrastructure/ssh/TunneledAdapter';

const destination = { host: 'db.internal', port: 5432 };

describe('buildSshArgs', () => {
  it('forwards only on the loopback address and never runs a remote command', () => {
    const args = buildSshArgs({ host: 'bastion' }, destination, 4000);
    expect(args.slice(0, 3)).toEqual(['-N', '-L', '127.0.0.1:4000:db.internal:5432']);
  });

  it('never asks anything and fails when the forward cannot be opened', () => {
    const args = buildSshArgs({ host: 'bastion' }, destination, 4000);
    expect(args).toEqual(expect.arrayContaining(['BatchMode=yes', 'ExitOnForwardFailure=yes']));
  });

  it('never weakens host key checking', () => {
    expect(buildSshArgs({ host: 'bastion' }, destination, 4000).join(' ')).not.toMatch(/StrictHostKeyChecking|UserKnownHostsFile/);
  });

  it('ends the options before the host', () => {
    expect(buildSshArgs({ host: 'bastion' }, destination, 4000).slice(-2)).toEqual(['--', 'bastion']);
  });

  it('passes the optional settings', () => {
    const args = buildSshArgs({ host: 'bastion', port: 2222, user: 'deploy', identityFile: 'C:\\keys\\id', jumpHost: 'gate' }, destination, 4000);
    expect(args.join(' ')).toContain('-p 2222 -l deploy -i C:\\keys\\id -J gate -- bastion');
  });

  it('leaves out what is not set, so the SSH config decides', () => {
    const args = buildSshArgs({ host: 'alias' }, destination, 4000);
    expect(args).not.toContain('-p');
    expect(args).not.toContain('-l');
    expect(args).not.toContain('-i');
    expect(args).not.toContain('-J');
  });

  it('wraps IPv6 destinations in brackets', () => {
    expect(buildSshArgs({ host: 'bastion' }, { host: '::1', port: 5432 }, 4000)[2]).toBe('127.0.0.1:4000:[::1]:5432');
  });

  it.each([
    ['host', { host: '-oProxyCommand=calc' }],
    ['host with a space', { host: 'bastion -oProxyCommand=calc' }],
    ['empty host', { host: '' }],
    ['user', { host: 'bastion', user: '-oProxyCommand=calc' }],
    ['jump host', { host: 'bastion', jumpHost: '-oProxyCommand=calc' }],
    ['key', { host: 'bastion', identityFile: '-oProxyCommand=calc' }],
  ])('refuses an unsafe %s, even if the settings were edited by hand', (_label, settings) => {
    expect(() => buildSshArgs(settings, destination, 4000)).toThrow(/Invalid/);
  });

  it('refuses an unsafe database host', () => {
    expect(() => buildSshArgs({ host: 'bastion' }, { host: '-x', port: 1 }, 4000)).toThrow(/database host/);
  });
});

describe('explainSshFailure', () => {
  it.each([
    ['Host key verification failed.', 'accept'],
    ['WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!', 'accept'],
    ['deploy@bastion: Permission denied (publickey).', 'refused the key'],
    ['WARNING: UNPROTECTED PRIVATE KEY FILE!', 'permissions'],
    ['ssh: Could not resolve hostname nope: Name or service not known', 'resolved'],
    ['ssh: connect to host 10.0.0.1 port 22: Connection timed out', 'could not be reached'],
    ['ssh: connect to host 10.0.0.1 port 22: Connection refused', 'could not be reached'],
    ['bind [127.0.0.1]:4000: Address already in use', 'already in use'],
    ['channel 0: open failed: administratively prohibited', 'port forwarding'],
  ])('explains "%s"', (stderr, expected) => {
    const message = explainSshFailure(stderr);
    expect(message).toContain(expected);
    expect(message).toContain(stderr);
  });

  it('explains a missing ssh command', () => {
    expect(explainSshFailure('', 'ENOENT')).toContain('Install an OpenSSH client');
  });

  it('keeps the original text of unknown failures', () => {
    expect(explainSshFailure('something odd')).toContain('something odd');
  });

  it('works without any detail', () => {
    expect(explainSshFailure('')).toBe('The SSH tunnel could not be opened.');
  });
});

describe('openSshTunnel', () => {
  it('refuses an unsafe host before running anything', async () => {
    await expect(openSshTunnel({ host: '-oProxyCommand=calc' }, destination, { sshBinary: 'binary-that-does-not-exist' })).rejects.toThrow(/Invalid SSH host/);
  });

  it('explains a missing ssh command', async () => {
    await expect(openSshTunnel({ host: 'bastion' }, destination, { sshBinary: 'binary-that-does-not-exist' })).rejects.toThrow(/Install an OpenSSH client/);
  });
});

describe('TunneledAdapter', () => {
  function createFakes() {
    let closeTunnel: (() => void) | undefined;
    let disconnectInner: (() => void) | undefined;
    const inner = {
      connect: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
      onDisconnect: (listener: () => void) => {
        disconnectInner = listener;
      },
      runQuery: vi.fn().mockResolvedValue('result'),
    } as unknown as DatabaseAdapter;
    const tunnel: SshTunnel = {
      localPort: 4000,
      onClose: (listener) => {
        closeTunnel = listener;
      },
      close: vi.fn().mockResolvedValue(undefined),
    };
    return { inner, tunnel, closeTunnel: () => closeTunnel?.(), disconnectInner: () => disconnectInner?.() };
  }

  it('delegates to the database adapter', async () => {
    const { inner, tunnel } = createFakes();
    const adapter = new TunneledAdapter(inner, tunnel);
    await expect(adapter.runQuery('SELECT 1', 10)).resolves.toBe('result');
    expect(inner.runQuery).toHaveBeenCalledWith('SELECT 1', 10);
  });

  it('closes the tunnel when disposed', async () => {
    const { inner, tunnel } = createFakes();
    await new TunneledAdapter(inner, tunnel).dispose();
    expect(inner.dispose).toHaveBeenCalledTimes(1);
    expect(tunnel.close).toHaveBeenCalledTimes(1);
  });

  it('closes the tunnel even if closing the database connection fails', async () => {
    const { inner, tunnel } = createFakes();
    vi.mocked(inner.dispose).mockRejectedValue(new Error('already gone'));
    await expect(new TunneledAdapter(inner, tunnel).dispose()).rejects.toThrow('already gone');
    expect(tunnel.close).toHaveBeenCalledTimes(1);
  });

  it('reports a disconnect when the tunnel drops', () => {
    const fakes = createFakes();
    const listener = vi.fn();
    new TunneledAdapter(fakes.inner, fakes.tunnel).onDisconnect(listener);
    fakes.closeTunnel();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reports a disconnect when the database connection drops', () => {
    const fakes = createFakes();
    const listener = vi.fn();
    new TunneledAdapter(fakes.inner, fakes.tunnel).onDisconnect(listener);
    fakes.disconnectInner();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
