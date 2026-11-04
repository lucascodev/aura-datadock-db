import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildCreateIndex(kind: DriverId, table: TableLocation, column: string): string {
  const indexName = `${table.name}_${column}_idx`;
  return `CREATE INDEX ${quoteIdentifier(kind, indexName)} ON ${quoteTable(kind, table)} (${quoteIdentifier(kind, column)});`;
}
