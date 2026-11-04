import type { NamespaceSchema } from '../../../domain/schema/NamespaceSchema';

export function selectTableNeighborhood(schema: NamespaceSchema, tableName: string): NamespaceSchema {
  const table = schema.tables.find((candidate) => candidate.name === tableName);
  if (!table) {
    return { ...schema, tables: [] };
  }
  const referenced = table.foreignKeys.filter((foreignKey) => foreignKey.referencedNamespace === schema.namespace).map((foreignKey) => foreignKey.referencedTable);
  const referencing = schema.tables
    .filter((candidate) => candidate.foreignKeys.some((foreignKey) => foreignKey.referencedNamespace === schema.namespace && foreignKey.referencedTable === tableName))
    .map((candidate) => candidate.name);
  const names = new Set([tableName, ...referenced, ...referencing]);
  return { ...schema, tables: schema.tables.filter((candidate) => names.has(candidate.name)) };
}
