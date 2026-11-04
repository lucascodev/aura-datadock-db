import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { ForeignKey } from '../../../../domain/schema/model/ForeignKey';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { renderColumnList } from './renderColumnList';

export function renderForeignKey(kind: DriverId, table: TableDefinition, foreignKey: ForeignKey): string {
  const target = quoteTable(kind, { namespace: foreignKey.referencedNamespace, name: foreignKey.referencedTable });
  const actions = [
    foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : '',
    foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : '',
  ].join('');

  return [
    `ALTER TABLE ${quoteTable(kind, table)}`,
    `  ADD CONSTRAINT ${quoteIdentifier(kind, foreignKey.name)}`,
    `  FOREIGN KEY (${renderColumnList(kind, foreignKey.columns)})`,
    `  REFERENCES ${target} (${renderColumnList(kind, foreignKey.referencedColumns)})${actions};`,
  ].join('\n');
}
