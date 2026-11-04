import { dbmlName } from './dbmlName';

export function qualifiedName(namespace: string, table: string): string {
  return `${dbmlName(namespace)}.${dbmlName(table)}`;
}
