import type { ForeignKey } from '../../../domain/schema/ForeignKey';
import type { NamespaceSchema } from '../../../domain/schema/NamespaceSchema';
import type { TableDefinition } from '../../../domain/schema/TableDefinition';
import type { Relationship, RelationshipCardinality } from './Relationship';

export function buildRelationships(schema: NamespaceSchema): Relationship[] {
  const tableNames = new Set(schema.tables.map((table) => table.name));

  return schema.tables.flatMap((table) =>
    table.foreignKeys
      .filter((foreignKey) => foreignKey.referencedNamespace === schema.namespace && tableNames.has(foreignKey.referencedTable))
      .map((foreignKey) => toRelationship(table, foreignKey)),
  );
}

function toRelationship(table: TableDefinition, foreignKey: ForeignKey): Relationship {
  return {
    name: foreignKey.name,
    childTable: table.name,
    childColumns: foreignKey.columns,
    parentTable: foreignKey.referencedTable,
    parentColumns: foreignKey.referencedColumns,
    cardinality: deriveCardinality(table, foreignKey),
    isParentOptional: foreignKey.columns.some((name) => table.columns.find((column) => column.name === name)?.nullable ?? false),
    onDelete: foreignKey.onDelete,
    onUpdate: foreignKey.onUpdate,
  };
}

function deriveCardinality(table: TableDefinition, foreignKey: ForeignKey): RelationshipCardinality {
  const uniqueColumnSets = [table.primaryKey, ...table.indexes.filter((index) => index.isUnique).map((index) => index.columns)];
  return uniqueColumnSets.some((columns) => isSameColumnSet(columns, foreignKey.columns)) ? 'one-to-one' : 'one-to-many';
}

function isSameColumnSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((column) => right.includes(column));
}
