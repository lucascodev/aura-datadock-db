import type { DriverId } from '../../../domain/driver/DriverId';
import type { ForeignKey } from '../../../domain/schema/ForeignKey';
import type { NamespaceSchema } from '../../../domain/schema/NamespaceSchema';
import type { TableColumn } from '../../../domain/schema/TableColumn';
import type { TableDefinition } from '../../../domain/schema/TableDefinition';
import type { TableIndex } from '../../../domain/schema/TableIndex';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';

const SEQUENCE_DEFAULT = /nextval\('([^']+)'/;

export interface RenderDdlOptions {
  readonly tableNames?: readonly string[];
}

export function renderDdl(schema: NamespaceSchema, options: RenderDdlOptions = {}): string {
  const selected = schema.tables.filter((table) => !options.tableNames || options.tableNames.includes(table.name));
  const tables = selected.filter((table) => table.kind === 'table');
  const views = selected.filter((table) => table.kind === 'view');
  const { kind } = schema;

  const sections = [
    tables.flatMap(renderSequences),
    tables.map((table) => renderCreateTable(kind, table)),
    tables.flatMap((table) => table.indexes.filter((index) => !index.isPrimary).map((index) => renderIndex(kind, table, index))),
    tables.flatMap((table) => table.foreignKeys.map((foreignKey) => renderForeignKey(kind, table, foreignKey))),
    views.map((view) => renderView(kind, view)),
  ];

  return sections
    .filter((section) => section.length > 0)
    .map((section) => section.join('\n\n'))
    .join('\n\n')
    .concat('\n');
}

function renderSequences(table: TableDefinition): string[] {
  return table.columns.flatMap((column) => {
    const sequence = column.defaultValue ? SEQUENCE_DEFAULT.exec(column.defaultValue)?.[1] : undefined;
    return sequence ? [`CREATE SEQUENCE IF NOT EXISTS ${sequence};`] : [];
  });
}

function renderCreateTable(kind: DriverId, table: TableDefinition): string {
  const columns = table.columns.map((column) => `  ${renderColumn(kind, column)}`);
  const primaryKey = table.primaryKey.length > 0 ? [`  PRIMARY KEY (${renderColumnList(kind, table.primaryKey)})`] : [];
  return `CREATE TABLE ${quoteTable(kind, table)} (\n${[...columns, ...primaryKey].join(',\n')}\n);`;
}

function renderColumn(kind: DriverId, column: TableColumn): string {
  const parts = [quoteIdentifier(kind, column.name), column.dataType];
  if (!column.nullable) {
    parts.push('NOT NULL');
  }
  if (column.defaultValue !== undefined) {
    parts.push(`DEFAULT ${column.defaultValue}`);
  }
  if (column.generationClause) {
    parts.push(column.generationClause);
  }
  return parts.join(' ');
}

function renderIndex(kind: DriverId, table: TableDefinition, index: TableIndex): string {
  if (index.definition) {
    return `${index.definition};`;
  }
  const unique = index.isUnique ? 'UNIQUE ' : '';
  return `CREATE ${unique}INDEX ${quoteIdentifier(kind, index.name)} ON ${quoteTable(kind, table)} (${renderColumnList(kind, index.columns)});`;
}

function renderForeignKey(kind: DriverId, table: TableDefinition, foreignKey: ForeignKey): string {
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

function renderView(kind: DriverId, view: TableDefinition): string {
  const definition = (view.viewDefinition ?? '').trim().replace(/;$/, '');
  return `CREATE VIEW ${quoteTable(kind, view)} AS\n${definition};`;
}

function renderColumnList(kind: DriverId, columns: readonly string[]): string {
  return columns.map((column) => quoteIdentifier(kind, column)).join(', ');
}
