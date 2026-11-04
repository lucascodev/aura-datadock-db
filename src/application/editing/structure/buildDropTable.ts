import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableRef } from '../../../domain/schema/model/TableRef';
import { quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import type { TableLocation } from '../model/TableLocation';

export function buildDropTable(kind: DriverId, table: TableLocation, tableKind: TableRef['kind']): string {
  return `DROP ${tableKind === 'view' ? 'VIEW' : 'TABLE'} ${quoteTable(kind, table)};`;
}
