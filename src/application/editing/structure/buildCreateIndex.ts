import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import type { TableLocation } from '../model/TableLocation';

export function buildCreateIndex(kind: DriverId, table: TableLocation, column: string): string {
  const indexName = `${table.name}_${column}_idx`;
  return `CREATE INDEX ${quoteIdentifier(kind, indexName)} ON ${quoteTable(kind, table)} (${quoteIdentifier(kind, column)});`;
}
