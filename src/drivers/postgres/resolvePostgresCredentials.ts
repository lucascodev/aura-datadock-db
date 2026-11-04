import type { ResolvedCredentials } from '../../domain/connection/ResolvedCredentials';

export function resolvePostgresCredentials(env: Readonly<Record<string, string>>): ResolvedCredentials {
  const user = env.POSTGRES_USER || 'postgres';
  const trust = env.POSTGRES_HOST_AUTH_METHOD === 'trust';
  return {
    user,
    password: env.POSTGRES_PASSWORD ?? (trust ? '' : undefined),
    database: env.POSTGRES_DB || user,
  };
}
