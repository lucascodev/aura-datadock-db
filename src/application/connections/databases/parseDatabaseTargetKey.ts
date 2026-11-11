import { DATABASE_TARGET_SEPARATOR } from '../constants/databaseTargetSeparator';

interface DatabaseTargetKey {
  readonly serverKey: string;
  readonly database: string;
}

export function parseDatabaseTargetKey(key: string): DatabaseTargetKey | undefined {
  const separatorIndex = key.indexOf(DATABASE_TARGET_SEPARATOR);
  if (separatorIndex < 0) {
    return undefined;
  }
  const database = key.slice(separatorIndex + DATABASE_TARGET_SEPARATOR.length);
  return database ? { serverKey: key.slice(0, separatorIndex), database } : undefined;
}
