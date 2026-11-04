import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import type { TableLocation } from '../model/TableLocation';

interface NewColumn {
  readonly name: string;
  readonly dataType: string;
  readonly isNullable: boolean;
}

export function buildAddColumn(kind: DriverId, table: TableLocation, column: NewColumn): string {
  const nullability = column.isNullable ? '' : ' NOT NULL';
  return `ALTER TABLE ${quoteTable(kind, table)} ADD COLUMN ${quoteIdentifier(kind, column.name)} ${column.dataType}${nullability};`;
}
