import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteTable } from '../../../../drivers/catalog/quoteTable';
import { renderCreateTable } from './renderCreateTable';
import { renderForeignKey } from './renderForeignKey';
import { renderIndex } from './renderIndex';

const SEQUENCE_DEFAULT = /nextval\('([^']+)'/;

interface RenderDdlOptions {
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

function renderView(kind: DriverId, view: TableDefinition): string {
  const definition = (view.viewDefinition ?? '').trim().replace(/;$/, '');
  return `CREATE VIEW ${quoteTable(kind, view)} AS\n${definition};`;
}
