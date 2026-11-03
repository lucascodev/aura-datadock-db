import { describe, expect, it } from 'vitest';
import { detectDatabaseKind } from '../src/docker/detectDatabaseKind';

describe('detectDatabaseKind', () => {
  it.each([
    ['postgres:17', 'postgres'],
    ['postgis/postgis:16-3.4', 'postgres'],
    ['timescale/timescaledb:latest-pg16', 'postgres'],
    ['pgvector/pgvector:pg17', 'postgres'],
    ['mysql:8.4', 'mysql'],
    ['bitnami/mariadb:11', 'mysql'],
    ['mariadb@sha256:abc', 'mysql'],
  ])('detects %s as %s', (image, kind) => {
    expect(detectDatabaseKind(image)).toBe(kind);
  });

  it.each(['redis:7', 'nginx:latest', 'node:22'])('ignores %s', (image) => {
    expect(detectDatabaseKind(image)).toBeUndefined();
  });
});
