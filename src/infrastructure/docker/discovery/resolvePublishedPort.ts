import type { DockerPort } from '../client/DockerContainer';

interface PublishedAddress {
  readonly host: string;
  readonly port: number;
}

const LOOPBACK = '127.0.0.1';
const WILDCARD_ADDRESSES = new Set(['', '0.0.0.0', '::']);

export function resolvePublishedPort(ports: readonly DockerPort[], privatePort: number): PublishedAddress | undefined {
  const mapping = ports.find((port) => port.PrivatePort === privatePort && port.Type === 'tcp' && port.PublicPort);
  if (!mapping?.PublicPort) {
    return undefined;
  }
  const boundAddress = mapping.IP ?? '';
  const host = WILDCARD_ADDRESSES.has(boundAddress) ? LOOPBACK : boundAddress;
  return { host, port: mapping.PublicPort };
}
