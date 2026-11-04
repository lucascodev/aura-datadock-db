import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DockerClient } from '../../../../src/infrastructure/docker/client/DockerClient';
import { ContainerDiscovery } from '../../../../src/infrastructure/docker/discovery/ContainerDiscovery';
import { passwordSecretName } from '../../../../src/presentation/vscode/commands/registry/DataDockContext';

const PUBLISHED_PORT = 55999;

function startFakeDocker(boundAddress: string): Promise<Server> {
  const container = { Id: 'abc', Names: ['/prod-db'], Image: 'postgres:17', Ports: [{ PrivatePort: 5432, PublicPort: PUBLISHED_PORT, IP: boundAddress, Type: 'tcp' }] };
  const server = createServer((request, response) => {
    response.end(JSON.stringify(request.url === '/containers/json' ? [container] : { Config: { Env: ['POSTGRES_USER=postgres'] } }));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function portOf(server: Server): number {
  return (server.address() as { port: number }).port;
}

async function discoverThrough(server: Server) {
  const client = new DockerClient({ type: 'tcp', host: '127.0.0.1', port: portOf(server) });
  const [target] = await new ContainerDiscovery(client).discover();
  return target;
}

describe('stored password of a container', () => {
  let trusted: Server;
  let other: Server;

  beforeAll(async () => {
    trusted = await startFakeDocker('127.0.0.1');
    other = await startFakeDocker('203.0.113.7');
  });

  afterAll(() => {
    trusted.close();
    other.close();
  });

  it('belongs to the Docker endpoint, not only to the container name', async () => {
    const original = await discoverThrough(trusted);
    const impostor = await discoverThrough(other);
    expect(impostor.name).toBe(original.name);
    expect(passwordSecretName(impostor)).not.toBe(passwordSecretName(original));
  });

  it('stays stable for the same endpoint', async () => {
    expect(passwordSecretName(await discoverThrough(trusted))).toBe(passwordSecretName(await discoverThrough(trusted)));
  });

  it('treats a container published on another machine as remote', async () => {
    expect((await discoverThrough(trusted)).isRemote).toBe(false);
    expect((await discoverThrough(other)).isRemote).toBe(true);
  });
});
