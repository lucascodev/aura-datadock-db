import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import { DATABASE_TARGET_SEPARATOR } from '../constants/databaseTargetSeparator';

export function toDatabaseTarget(server: ConnectionTarget, database: string): ConnectionTarget {
  if (database === server.database) {
    return server;
  }
  return {
    ...server,
    id: `${server.id}${DATABASE_TARGET_SEPARATOR}${database}`,
    key: `${server.key}${DATABASE_TARGET_SEPARATOR}${database}`,
    name: `${server.name}/${database}`,
    parentId: server.id,
    database,
  };
}
