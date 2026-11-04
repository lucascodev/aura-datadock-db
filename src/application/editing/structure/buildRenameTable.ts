import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildRenameTable(kind: DriverId, table: TableLocation, newName: string): string {
  const { renameTable } = getDriver(kind).dialect;
  return `${renameTable(quoteTable(kind, table), quoteIdentifier(kind, table.namespace), quoteIdentifier(kind, newName))};`;
}
