import { describe, expect, it } from 'vitest';
import { parseDockerHost, resolveDockerEndpoint } from '../src/docker/resolveDockerEndpoint';

describe('parseDockerHost', () => {
  it('parses unix sockets', () => {
    expect(parseDockerHost('unix:///var/run/docker.sock')).toEqual({ type: 'socket', socketPath: '/var/run/docker.sock' });
  });

  it('parses Windows named pipes', () => {
    expect(parseDockerHost('npipe:////./pipe/docker_engine')).toEqual({ type: 'socket', socketPath: '\\\\.\\pipe\\docker_engine' });
  });

  it('parses tcp endpoints', () => {
    expect(parseDockerHost('tcp://10.0.0.5:2376')).toEqual({ type: 'tcp', host: '10.0.0.5', port: 2376 });
  });
});

describe('resolveDockerEndpoint', () => {
  it('prefers the configured value over DOCKER_HOST', () => {
    const endpoint = resolveDockerEndpoint('tcp://a:1', { DOCKER_HOST: 'tcp://b:2' }, 'linux');
    expect(endpoint).toEqual({ type: 'tcp', host: 'a', port: 1 });
  });

  it('uses the named pipe on Windows', () => {
    expect(resolveDockerEndpoint(undefined, {}, 'win32')).toEqual({ type: 'socket', socketPath: '\\\\.\\pipe\\docker_engine' });
  });

  it('picks the first existing socket on Unix', () => {
    const endpoint = resolveDockerEndpoint(undefined, {}, 'darwin', (path) => path.endsWith('.docker/run/docker.sock'));
    expect(endpoint.type === 'socket' && endpoint.socketPath.endsWith('.docker/run/docker.sock')).toBe(true);
  });
});
