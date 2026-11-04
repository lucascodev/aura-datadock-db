import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import { buildRelationships } from '../../relationships/buildRelationships';
import { renderReference } from './renderReference';
import { renderTable } from './renderTable';

export function renderDbml(schema: NamespaceSchema): string {
  const tables = schema.tables.filter((table) => table.kind === 'table').map((table) => renderTable(schema.namespace, table));
  const references = buildRelationships(schema).map((relationship) => renderReference(schema.namespace, relationship));
  return [...tables, ...references].join('\n\n').concat('\n');
}
