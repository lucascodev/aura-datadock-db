import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildTruncateTable(kind: DriverId, table: TableLocation): string {
  return `TRUNCATE TABLE ${quoteTable(kind, table)};`;
}
