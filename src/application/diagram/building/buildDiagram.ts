import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { buildRelationships } from '../../schema/relationships/buildRelationships';
import type { Relationship } from '../../schema/model/Relationship';
import {
  BADGE_WIDTH,
  BOTTOM_PADDING,
  CHARACTER_WIDTH,
  COLUMN_GAP,
  HEADER_HEIGHT,
  HORIZONTAL_PADDING,
  MAX_LABEL_CHARACTERS,
  MAX_TABLE_WIDTH,
  MAX_TYPE_CHARACTERS,
  MIN_TABLE_WIDTH,
  ROW_HEIGHT,
} from '../constants/diagramMetrics';
import type { DiagramColumn, DiagramDetail, DiagramEdge, DiagramModel, DiagramTable } from '../model/DiagramModel';

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

function toDiagramTable(
  table: TableDefinition,
  detail: DiagramDetail,
  referencedColumns: ReadonlyMap<string, ReadonlySet<string>>,
): DiagramTable {
  const allColumns = toDiagramColumns(table);
  const referenced = referencedColumns.get(table.name);
  const columns = allColumns.filter((column) => isColumnVisible(column, detail, referenced));

  return {
    name: table.name,
    kind: table.kind,
    columns,
    width: computeTableWidth(table.name, columns),
    height: HEADER_HEIGHT + columns.length * ROW_HEIGHT + (columns.length > 0 ? BOTTOM_PADDING : 0),
  };
}

function toDiagramColumns(table: TableDefinition): DiagramColumn[] {
  return table.columns.map((column) => {
    const foreignKey = table.foreignKeys.find((candidate) => candidate.columns.includes(column.name));
    return {
      name: column.name,
      dataType: column.dataType,
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: foreignKey !== undefined,
      isNullable: column.nullable,
      foreignTarget: foreignKey ? `${foreignKey.referencedNamespace}.${foreignKey.referencedTable}` : undefined,
    };
  });
}

function isColumnVisible(column: DiagramColumn, detail: DiagramDetail, referenced?: ReadonlySet<string>): boolean {
  if (detail === 'entities') {
    return false;
  }
  return detail === 'full' || column.isPrimaryKey || column.isForeignKey || (referenced?.has(column.name) ?? false);
}

function computeTableWidth(tableName: string, columns: readonly DiagramColumn[]): number {
  const headerWidth = tableName.length * CHARACTER_WIDTH + HORIZONTAL_PADDING * 2;
  const rowWidths = columns.map((column) => {
    const labelWidth = Math.min(column.name.length, MAX_LABEL_CHARACTERS) * CHARACTER_WIDTH;
    const typeWidth = Math.min(column.dataType.length, MAX_TYPE_CHARACTERS) * CHARACTER_WIDTH;
    return HORIZONTAL_PADDING * 2 + BADGE_WIDTH + labelWidth + COLUMN_GAP + typeWidth;
  });
  return Math.ceil(Math.min(MAX_TABLE_WIDTH, Math.max(MIN_TABLE_WIDTH, headerWidth, ...rowWidths)));
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
