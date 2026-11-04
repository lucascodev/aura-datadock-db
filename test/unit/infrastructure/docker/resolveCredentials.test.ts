import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../../src/infrastructure/docker/discovery/parseEnv';
import { resolveCredentials } from '../../../../src/infrastructure/docker/discovery/resolveCredentials';

describe('parseEnv', () => {
  it('keeps values that contain equals signs', () => {
    expect(parseEnv(['A=1', 'URL=postgres://u:p@h/db?x=y'])).toEqual({ A: '1', URL: 'postgres://u:p@h/db?x=y' });
  });
});

describe('resolveCredentials for postgres', () => {
  it('uses the official image defaults', () => {
    expect(resolveCredentials('postgres', { POSTGRES_PASSWORD: 'secret' })).toEqual({
      user: 'postgres',
      password: 'secret',
      database: 'postgres',
    });
  });

  it('defaults the database to the user name', () => {
    const credentials = resolveCredentials('postgres', { POSTGRES_USER: 'app', POSTGRES_PASSWORD: 'x' });
    expect(credentials.database).toBe('app');
  });

  it('accepts trust authentication without password', () => {
    expect(resolveCredentials('postgres', { POSTGRES_HOST_AUTH_METHOD: 'trust' }).password).toBe('');
  });

  it('leaves the password undefined when it comes from a secret file', () => {
    expect(resolveCredentials('postgres', { POSTGRES_PASSWORD_FILE: '/run/secrets/db' }).password).toBeUndefined();
  });
});

describe('resolveCredentials for mysql', () => {
  it('prefers root when the root password is available', () => {
    const credentials = resolveCredentials('mysql', { MYSQL_ROOT_PASSWORD: 'root', MYSQL_USER: 'app', MYSQL_DATABASE: 'shop' });
    expect(credentials).toEqual({ user: 'root', password: 'root', database: 'shop' });
  });

  it('falls back to the application user', () => {
    const credentials = resolveCredentials('mysql', { MARIADB_USER: 'app', MARIADB_PASSWORD: 'pw' });
    expect(credentials).toEqual({ user: 'app', password: 'pw', database: undefined });
  });

  it('supports empty root password', () => {
    expect(resolveCredentials('mysql', { MYSQL_ALLOW_EMPTY_PASSWORD: 'yes' }).password).toBe('');
  });
});
