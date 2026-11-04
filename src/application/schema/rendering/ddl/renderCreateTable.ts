import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { TableColumn } from '../../../../domain/schema/model/TableColumn';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { renderColumnList } from './renderColumnList';

export function renderCreateTable(kind: DriverId, table: TableDefinition): string {
  const columns = table.columns.map((column) => `  ${renderColumn(kind, column)}`);
  const primaryKey = table.primaryKey.length > 0 ? [`  PRIMARY KEY (${renderColumnList(kind, table.primaryKey)})`] : [];
  return `CREATE TABLE ${quoteTable(kind, table)} (\n${[...columns, ...primaryKey].join(',\n')}\n);`;
}

function renderColumn(kind: DriverId, column: TableColumn): string {
  const parts = [quoteIdentifier(kind, column.name), column.dataType];
  if (!column.nullable) {
    parts.push('NOT NULL');
  }
  if (column.defaultValue !== undefined) {
    parts.push(`DEFAULT ${column.defaultValue}`);
  }
  if (column.generationClause) {
    parts.push(column.generationClause);
  }
  return parts.join(' ');
}
