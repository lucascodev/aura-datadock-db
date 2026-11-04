import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { postgresDialect } from './postgresDialect';
import { resolvePostgresCredentials } from './resolvePostgresCredentials';

export const postgresDriver: DriverDescriptor = {
  id: 'postgres',
  label: 'PostgreSQL',
  defaultPort: 5432,
  connectionSchemes: ['postgres', 'postgresql'],
  defaultNamespace: 'public',
  dialect: postgresDialect,
  docker: {
    imagePatterns: [/(^|\/)(postgres|postgis|timescaledb|pgvector|supabase\/postgres)/i],
    resolveCredentials: resolvePostgresCredentials,
  },
};
