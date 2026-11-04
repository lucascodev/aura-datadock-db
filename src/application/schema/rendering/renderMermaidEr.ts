import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { TableColumn } from '../../../domain/schema/model/TableColumn';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { buildRelationships } from '../relationships/buildRelationships';
import type { Relationship } from '../model/Relationship';

const NON_WORD_CHARACTERS = /\W+/g;
const INDENT = '  ';
const ATTRIBUTE_INDENT = '    ';

export function renderMermaidEr(schema: NamespaceSchema): string {
  const entities = schema.tables.flatMap(renderEntity);
  const relationships = buildRelationships(schema).map(renderRelationship);
  return ['erDiagram', ...relationships, ...entities].join('\n').concat('\n');
}

function renderEntity(table: TableDefinition): string[] {
  const foreignKeyColumns = new Set(table.foreignKeys.flatMap((foreignKey) => foreignKey.columns));
  const uniqueColumns = new Set(table.indexes.filter((index) => index.isUnique && index.columns.length === 1).flatMap((index) => index.columns));
  const attributes = table.columns.map((column) => `${ATTRIBUTE_INDENT}${renderAttribute(column, foreignKeyColumns, uniqueColumns)}`);
  return [`${INDENT}${entityName(table.name)} {`, ...attributes, `${INDENT}}`];
}

function renderAttribute(column: TableColumn, foreignKeyColumns: ReadonlySet<string>, uniqueColumns: ReadonlySet<string>): string {
  const keys = [
    column.isPrimaryKey ? 'PK' : undefined,
    foreignKeyColumns.has(column.name) ? 'FK' : undefined,
    !column.isPrimaryKey && uniqueColumns.has(column.name) ? 'UK' : undefined,
  ].filter((key) => key !== undefined);
  return [toWord(column.dataType), toWord(column.name), keys.join(', ')].filter((part) => part.length > 0).join(' ');
}

function renderRelationship(relationship: Relationship): string {
  const parentSide = relationship.isParentOptional ? '|o' : '||';
  const childSide = relationship.cardinality === 'one-to-one' ? 'o|' : 'o{';
  const label = relationship.childColumns.join(', ').replace(/"/g, "'");
  return `${INDENT}${entityName(relationship.parentTable)} ${parentSide}--${childSide} ${entityName(relationship.childTable)} : "${label}"`;
}

function entityName(name: string): string {
  return /^\w+$/.test(name) ? name : `"${name.replace(/"/g, "'")}"`;
}

function toWord(text: string): string {
  return text.replace(NON_WORD_CHARACTERS, '_').replace(/^_+|_+$/g, '');
}
