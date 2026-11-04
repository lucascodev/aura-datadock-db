import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { TableColumn } from '../../../domain/schema/model/TableColumn';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import type { TableIndex } from '../../../domain/schema/model/TableIndex';
import { buildRelationships } from '../relationships/buildRelationships';
import type { Relationship } from '../relationships/Relationship';

const SIMPLE_NAME = /^[A-Za-z_]\w*$/;
const SIMPLE_TYPE = /^[A-Za-z_]\w*(\(\d+(,\s*\d+)?\))?$/;

export function renderDbml(schema: NamespaceSchema): string {
  const tables = schema.tables.filter((table) => table.kind === 'table').map((table) => renderTable(schema.namespace, table));
  const references = buildRelationships(schema).map((relationship) => renderReference(schema.namespace, relationship));
  return [...tables, ...references].join('\n\n').concat('\n');
}

function renderTable(namespace: string, table: TableDefinition): string {
  const isCompositeKey = table.primaryKey.length > 1;
  const columns = table.columns.map((column) => `  ${renderColumn(column, isCompositeKey)}`);
  const indexes = renderIndexes(table, isCompositeKey);
  return [`Table ${qualified(namespace, table.name)} {`, ...columns, ...indexes, '}'].join('\n');
}

function renderColumn(column: TableColumn, isCompositeKey: boolean): string {
  const settings = [
    column.isPrimaryKey && !isCompositeKey ? 'pk' : undefined,
    column.nullable ? undefined : 'not null',
    column.generationClause ? 'increment' : undefined,
    column.defaultValue !== undefined ? `default: ${renderDefault(column.defaultValue)}` : undefined,
  ].filter((setting) => setting !== undefined);
  const suffix = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
  return `${name(column.name)} ${renderType(column.dataType)}${suffix}`;
}

function renderIndexes(table: TableDefinition, isCompositeKey: boolean): string[] {
  const secondary = table.indexes.filter((index) => !index.isPrimary).map(renderIndex);
  const primary = isCompositeKey ? [`(${table.primaryKey.map(name).join(', ')}) [pk]`] : [];
  const entries = [...primary, ...secondary];
  if (entries.length === 0) {
    return [];
  }
  return ['', '  Indexes {', ...entries.map((entry) => `    ${entry}`), '  }'];
}

function renderIndex(index: TableIndex): string {
  const unique = index.isUnique ? ', unique' : '';
  const columns = index.columns.length === 1 ? name(index.columns[0]) : `(${index.columns.map(name).join(', ')})`;
  return `${columns} [name: '${index.name.replace(/'/g, "\\'")}'${unique}]`;
}

function renderReference(namespace: string, relationship: Relationship): string {
  const operator = relationship.cardinality === 'one-to-one' ? '-' : '>';
  const child = renderEndpoint(namespace, relationship.childTable, relationship.childColumns);
  const parent = renderEndpoint(namespace, relationship.parentTable, relationship.parentColumns);
  const actions = [
    relationship.onDelete ? `delete: ${relationship.onDelete.toLowerCase()}` : undefined,
    relationship.onUpdate ? `update: ${relationship.onUpdate.toLowerCase()}` : undefined,
  ].filter((action) => action !== undefined);
  const suffix = actions.length > 0 ? ` [${actions.join(', ')}]` : '';
  return `Ref: ${child} ${operator} ${parent}${suffix}`;
}

function renderEndpoint(namespace: string, table: string, columns: readonly string[]): string {
  const target = columns.length === 1 ? name(columns[0]) : `(${columns.map(name).join(', ')})`;
  return `${qualified(namespace, table)}.${target}`;
}

function renderDefault(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  if (/^'.*'(::[\w. ]+)?$/s.test(value)) {
    return `'${value.replace(/^'|'(::[\w. ]+)?$/g, '').replace(/''/g, "\\'")}'`;
  }
  return `\`${value.replace(/`/g, '')}\``;
}

function renderType(dataType: string): string {
  return SIMPLE_TYPE.test(dataType) ? dataType : `"${dataType.replace(/"/g, '\\"')}"`;
}

function qualified(namespace: string, table: string): string {
  return `${name(namespace)}.${name(table)}`;
}

function name(identifier: string): string {
  return SIMPLE_NAME.test(identifier) ? identifier : `"${identifier.replace(/"/g, '\\"')}"`;
}
