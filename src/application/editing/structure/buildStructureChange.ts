import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableRef } from '../../../domain/schema/model/TableRef';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';

type TableLocation = Pick<TableRef, 'namespace' | 'name'>;

interface NewColumn {
  readonly name: string;
  readonly dataType: string;
  readonly isNullable: boolean;
}

export function buildCreateTable(kind: DriverId, table: TableLocation): string {
  const { autoIncrementPrimaryKey } = getDriver(kind).dialect;
  return `CREATE TABLE ${quoteTable(kind, table)} (\n  ${quoteIdentifier(kind, 'id')} ${autoIncrementPrimaryKey}\n);`;
}

export function buildAddColumn(kind: DriverId, table: TableLocation, column: NewColumn): string {
  const nullability = column.isNullable ? '' : ' NOT NULL';
  return `ALTER TABLE ${quoteTable(kind, table)} ADD COLUMN ${quoteIdentifier(kind, column.name)} ${column.dataType}${nullability};`;
}

export function buildRenameTable(kind: DriverId, table: TableLocation, newName: string): string {
  const { renameTable } = getDriver(kind).dialect;
  return `${renameTable(quoteTable(kind, table), quoteIdentifier(kind, table.namespace), quoteIdentifier(kind, newName))};`;
}

export function buildTruncateTable(kind: DriverId, table: TableLocation): string {
  return `TRUNCATE TABLE ${quoteTable(kind, table)};`;
}

export function buildDropTable(kind: DriverId, table: TableLocation, tableKind: TableRef['kind']): string {
  return `DROP ${tableKind === 'view' ? 'VIEW' : 'TABLE'} ${quoteTable(kind, table)};`;
}

export function buildRenameColumn(kind: DriverId, table: TableLocation, column: string, newName: string): string {
  return `ALTER TABLE ${quoteTable(kind, table)} RENAME COLUMN ${quoteIdentifier(kind, column)} TO ${quoteIdentifier(kind, newName)};`;
}

export function buildDropColumn(kind: DriverId, table: TableLocation, column: string): string {
  return `ALTER TABLE ${quoteTable(kind, table)} DROP COLUMN ${quoteIdentifier(kind, column)};`;
}

export function buildCreateIndex(kind: DriverId, table: TableLocation, column: string): string {
  const indexName = `${table.name}_${column}_idx`;
  return `CREATE INDEX ${quoteIdentifier(kind, indexName)} ON ${quoteTable(kind, table)} (${quoteIdentifier(kind, column)});`;
}
