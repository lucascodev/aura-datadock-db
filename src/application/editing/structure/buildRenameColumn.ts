import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildRenameColumn(kind: DriverId, table: TableLocation, column: string, newName: string): string {
  return `ALTER TABLE ${quoteTable(kind, table)} RENAME COLUMN ${quoteIdentifier(kind, column)} TO ${quoteIdentifier(kind, newName)};`;
}
