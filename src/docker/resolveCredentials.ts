import type { DatabaseKind } from '../domain/DatabaseKind';

export interface ResolvedCredentials {
  readonly user: string;
  readonly password?: string;
  readonly database?: string;
}

export function parseEnv(entries: readonly string[] = []): Record<string, string> {
  const env: Record<string, string> = {};
  for (const entry of entries) {
    const index = entry.indexOf('=');
    if (index > 0) {
      env[entry.slice(0, index)] = entry.slice(index + 1);
    }
  }
  return env;
}

export function resolveCredentials(kind: DatabaseKind, env: Record<string, string>): ResolvedCredentials {
  return kind === 'postgres' ? resolvePostgres(env) : resolveMysql(env);
}

function resolvePostgres(env: Record<string, string>): ResolvedCredentials {
  const user = env.POSTGRES_USER || 'postgres';
  const trust = env.POSTGRES_HOST_AUTH_METHOD === 'trust';
  return {
    user,
    password: env.POSTGRES_PASSWORD ?? (trust ? '' : undefined),
    database: env.POSTGRES_DB || user,
  };
}

function resolveMysql(env: Record<string, string>): ResolvedCredentials {
  const database = env.MYSQL_DATABASE || env.MARIADB_DATABASE || undefined;
  const rootPassword = env.MYSQL_ROOT_PASSWORD ?? env.MARIADB_ROOT_PASSWORD;
  if (rootPassword !== undefined) {
    return { user: 'root', password: rootPassword, database };
  }

  const appUser = env.MYSQL_USER || env.MARIADB_USER;
  const appPassword = env.MYSQL_PASSWORD ?? env.MARIADB_PASSWORD;
  if (appUser) {
    return { user: appUser, password: appPassword, database };
  }

  const allowEmpty = isTruthy(env.MYSQL_ALLOW_EMPTY_PASSWORD) || isTruthy(env.MARIADB_ALLOW_EMPTY_ROOT_PASSWORD);
  return { user: 'root', password: allowEmpty ? '' : undefined, database };
}

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}
