import type { DriverId } from '../../domain/driver/model/DriverId';
import type { TableRef } from '../../domain/schema/model/TableRef';
import { quoteIdentifier } from './quoteIdentifier';

export function quoteTable(kind: DriverId, table: Pick<TableRef, 'namespace' | 'name'>): string {
  return `${quoteIdentifier(kind, table.namespace)}.${quoteIdentifier(kind, table.name)}`;
}
