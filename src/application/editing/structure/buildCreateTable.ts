import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/getDriver';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import type { TableLocation } from '../model/TableLocation';

export function buildCreateTable(kind: DriverId, table: TableLocation): string {
  const { autoIncrementPrimaryKey } = getDriver(kind).dialect;
  return `CREATE TABLE ${quoteTable(kind, table)} (\n  ${quoteIdentifier(kind, 'id')} ${autoIncrementPrimaryKey}\n);`;
}
