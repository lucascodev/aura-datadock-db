import type { DriverId } from '../../domain/driver/model/DriverId';
import type { TableRef } from '../../domain/schema/model/TableRef';
import { getDriver } from './driverCatalog';

export function quoteIdentifier(kind: DriverId, identifier: string): string {
  const quote = getDriver(kind).dialect.identifierQuote;
  return `${quote}${identifier.split(quote).join(quote + quote)}${quote}`;
}

export function quoteTable(kind: DriverId, table: Pick<TableRef, 'namespace' | 'name'>): string {
  return `${quoteIdentifier(kind, table.namespace)}.${quoteIdentifier(kind, table.name)}`;
}
