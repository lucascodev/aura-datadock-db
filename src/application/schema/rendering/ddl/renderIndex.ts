import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { TableIndex } from '../../../../domain/schema/model/TableIndex';
import { quoteIdentifier } from '../../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { renderColumnList } from './renderColumnList';

export function renderIndex(kind: DriverId, table: TableDefinition, index: TableIndex): string {
  if (index.definition) {
    return `${index.definition};`;
  }
  const unique = index.isUnique ? 'UNIQUE ' : '';
  return `CREATE ${unique}INDEX ${quoteIdentifier(kind, index.name)} ON ${quoteTable(kind, table)} (${renderColumnList(kind, index.columns)});`;
}
