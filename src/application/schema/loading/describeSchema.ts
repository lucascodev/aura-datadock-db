import type { DatabaseAdapter } from '../../../domain/database/DatabaseAdapter';
import type { ForeignKey } from '../../../domain/schema/ForeignKey';
import type { TableDefinition } from '../../../domain/schema/TableDefinition';

export interface DescribeSchemaOptions {
  readonly maxTables: number;
  readonly namespace?: string;
}

export async function describeSchema(
  adapter: Pick<DatabaseAdapter, 'listNamespaces' | 'readSchema'>,
  options: DescribeSchemaOptions,
): Promise<string> {
  const namespaces = options.namespace ? [options.namespace] : await adapter.listNamespaces();
  const lines: string[] = [];

  for (const namespace of namespaces) {
    const schema = await adapter.readSchema(namespace);
    for (const table of schema.tables) {
      if (lines.length >= options.maxTables) {
        lines.push(`... more tables omitted (limit ${options.maxTables})`);
        return lines.join('\n');
      }
      lines.push(describeTable(table));
    }
  }

  return lines.join('\n');
}

function describeTable(table: TableDefinition): string {
  const columns = table.columns
    .map((column) => `${column.name} ${column.dataType}${column.isPrimaryKey ? ' PK' : ''}${column.nullable ? '' : ' NOT NULL'}`)
    .join(', ');
  const references = table.foreignKeys.map(describeForeignKey).join('');
  return `${table.namespace}.${table.name}(${columns})${references}`;
}

function describeForeignKey(foreignKey: ForeignKey): string {
  const target = `${foreignKey.referencedNamespace}.${foreignKey.referencedTable}(${foreignKey.referencedColumns.join(', ')})`;
  return ` FK(${foreignKey.columns.join(', ')}) -> ${target}`;
}
