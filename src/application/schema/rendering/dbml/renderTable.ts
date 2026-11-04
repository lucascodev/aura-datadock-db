import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { TableIndex } from '../../../../domain/schema/model/TableIndex';
import { dbmlName } from './dbmlName';
import { qualifiedName } from './qualifiedName';
import { renderColumn } from './renderColumn';

export function renderTable(namespace: string, table: TableDefinition): string {
  const isCompositeKey = table.primaryKey.length > 1;
  const columns = table.columns.map((column) => `  ${renderColumn(column, isCompositeKey)}`);
  const indexes = renderIndexes(table, isCompositeKey);
  return [`Table ${qualifiedName(namespace, table.name)} {`, ...columns, ...indexes, '}'].join('\n');
}

function renderIndexes(table: TableDefinition, isCompositeKey: boolean): string[] {
  const secondary = table.indexes.filter((index) => !index.isPrimary).map(renderIndex);
  const primary = isCompositeKey ? [`(${table.primaryKey.map(dbmlName).join(', ')}) [pk]`] : [];
  const entries = [...primary, ...secondary];
  if (entries.length === 0) {
    return [];
  }
  return ['', '  Indexes {', ...entries.map((entry) => `    ${entry}`), '  }'];
}

function renderIndex(index: TableIndex): string {
  const unique = index.isUnique ? ', unique' : '';
  const columns = index.columns.length === 1 ? dbmlName(index.columns[0]) : `(${index.columns.map(dbmlName).join(', ')})`;
  return `${columns} [name: '${index.name.replace(/'/g, "\\'")}'${unique}]`;
}
