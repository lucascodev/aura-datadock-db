import { describe, expect, it } from 'vitest';
import { resolvePublishedPort } from '../src/docker/resolvePublishedPort';

describe('resolvePublishedPort', () => {
  it('maps wildcard bindings to loopback', () => {
    const ports = [{ IP: '0.0.0.0', PrivatePort: 5432, PublicPort: 15432, Type: 'tcp' }];
    expect(resolvePublishedPort(ports, 5432)).toEqual({ host: '127.0.0.1', port: 15432 });
  });

  it('keeps an explicit host binding', () => {
    const ports = [{ IP: '192.168.0.10', PrivatePort: 3306, PublicPort: 3306, Type: 'tcp' }];
    expect(resolvePublishedPort(ports, 3306)).toEqual({ host: '192.168.0.10', port: 3306 });
  });

  it('returns undefined when the port is not published', () => {
    expect(resolvePublishedPort([{ PrivatePort: 5432, Type: 'tcp' }], 5432)).toBeUndefined();
  });
});
