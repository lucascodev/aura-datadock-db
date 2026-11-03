import type { DatabaseKind } from '../domain/DatabaseKind';

const IMAGE_PATTERNS: ReadonlyArray<readonly [RegExp, DatabaseKind]> = [
  [/(^|\/)(postgres|postgis|timescaledb|pgvector|supabase\/postgres)/i, 'postgres'],
  [/(^|\/)(mysql|mariadb|percona)/i, 'mysql'],
];

export const DEFAULT_PORTS: Readonly<Record<DatabaseKind, number>> = {
  postgres: 5432,
  mysql: 3306,
};

export function detectDatabaseKind(image: string): DatabaseKind | undefined {
  const name = image.split('@')[0];
  return IMAGE_PATTERNS.find(([pattern]) => pattern.test(name))?.[1];
}
