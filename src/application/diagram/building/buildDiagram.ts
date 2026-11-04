import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import { buildRelationships } from '../../schema/relationships/buildRelationships';
import type { Relationship } from '../../schema/model/Relationship';
import type { DiagramDetail, DiagramEdge, DiagramModel } from '../model/DiagramModel';
import { toDiagramTable } from './toDiagramTable';

export function buildDiagram(schema: NamespaceSchema, detail: DiagramDetail): DiagramModel {
  const relationships = buildRelationships(schema);
  const referencedColumns = collectReferencedColumns(relationships);
  const tables = schema.tables.map((table) => toDiagramTable(table, detail, referencedColumns));
  const columnsByTable = new Map(tables.map((table) => [table.name, new Set(table.columns.map((column) => column.name))]));

  return {
    namespace: schema.namespace,
    detail,
    tables,
    edges: relationships.map((relationship) => toDiagramEdge(relationship, columnsByTable)),
  };
}

function collectReferencedColumns(relationships: readonly Relationship[]): ReadonlyMap<string, ReadonlySet<string>> {
  const referenced = new Map<string, Set<string>>();
  for (const relationship of relationships) {
    const columns = referenced.get(relationship.parentTable) ?? new Set<string>();
    relationship.parentColumns.forEach((column) => columns.add(column));
    referenced.set(relationship.parentTable, columns);
  }
  return referenced;
}

function toDiagramEdge(relationship: Relationship, columnsByTable: ReadonlyMap<string, ReadonlySet<string>>): DiagramEdge {
  const childColumn = relationship.childColumns[0];
  const parentColumn = relationship.parentColumns[0];

  return {
    id: `${relationship.childTable}.${relationship.name}`,
    name: relationship.name,
    childTable: relationship.childTable,
    childColumn: columnsByTable.get(relationship.childTable)?.has(childColumn) ? childColumn : undefined,
    parentTable: relationship.parentTable,
    parentColumn: columnsByTable.get(relationship.parentTable)?.has(parentColumn) ? parentColumn : undefined,
    cardinality: relationship.cardinality,
    isParentOptional: relationship.isParentOptional,
  };
}
