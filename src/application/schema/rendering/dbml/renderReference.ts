import type { Relationship } from '../../model/Relationship';
import { dbmlName } from './dbmlName';
import { qualifiedName } from './qualifiedName';

export function renderReference(namespace: string, relationship: Relationship): string {
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
  const target = columns.length === 1 ? dbmlName(columns[0]) : `(${columns.map(dbmlName).join(', ')})`;
  return `${qualifiedName(namespace, table)}.${target}`;
}
