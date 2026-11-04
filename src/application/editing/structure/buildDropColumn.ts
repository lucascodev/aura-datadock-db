import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildDropColumn(kind: DriverId, table: TableLocation, column: string): string {
  return `ALTER TABLE ${quoteTable(kind, table)} DROP COLUMN ${quoteIdentifier(kind, column)};`;
}
