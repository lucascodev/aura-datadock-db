import type { DatabaseAdapter } from '../domain/DatabaseAdapter';

export interface DescribeSchemaOptions {
  readonly maxTables: number;
  readonly namespace?: string;
}

export async function describeSchema(adapter: DatabaseAdapter, options: DescribeSchemaOptions): Promise<string> {
  const namespaces = options.namespace ? [options.namespace] : await adapter.listNamespaces();
  const lines: string[] = [];
  let tableCount = 0;

  for (const namespace of namespaces) {
    const tables = await adapter.listTables(namespace);
    for (const table of tables) {
      if (tableCount >= options.maxTables) {
        lines.push(`... more tables omitted (limit ${options.maxTables})`);
        return lines.join('\n');
      }
      const columns = await adapter.listColumns(table);
      const columnText = columns
        .map((column) => `${column.name} ${column.dataType}${column.isPrimaryKey ? ' PK' : ''}${column.nullable ? '' : ' NOT NULL'}`)
        .join(', ');
      lines.push(`${namespace}.${table.name}(${columnText})`);
      tableCount++;
    }
  }

  return lines.join('\n');
}
