import type { ResolvedCredentials } from '../../domain/connection/ResolvedCredentials';

export function resolveMysqlCredentials(env: Readonly<Record<string, string>>): ResolvedCredentials {
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
