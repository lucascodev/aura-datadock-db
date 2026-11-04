import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { TableReference } from '../../model/TableReference';
import { isSameName } from './isSameName';

export function findTable(tables: readonly TableDefinition[], reference: Pick<TableReference, 'namespace' | 'name'>): TableDefinition | undefined {
  return tables.find(
    (table) => isSameName(table.name, reference.name) && (reference.namespace === undefined || isSameName(table.namespace, reference.namespace)),
  );
}
