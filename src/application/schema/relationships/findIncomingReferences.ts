import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { IncomingReference } from './IncomingReference';

export function findIncomingReferences(schema: NamespaceSchema, tableName: string): IncomingReference[] {
  return schema.tables.flatMap((table) =>
    table.foreignKeys
      .filter((foreignKey) => foreignKey.referencedNamespace === schema.namespace && foreignKey.referencedTable === tableName)
      .map((foreignKey) => ({
        name: foreignKey.name,
        table: table.name,
        columns: foreignKey.columns,
        referencedColumns: foreignKey.referencedColumns,
      })),
  );
}
