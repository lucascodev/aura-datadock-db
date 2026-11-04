import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteIfNeeded } from '../../../sql/building/quoteIfNeeded';
import type { CompletionRequest } from '../../model/CompletionRequest';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';
import type { TableReference } from '../../model/TableReference';
import { suggestColumns } from '../candidates/suggestColumns';
import { toTableSuggestion } from '../candidates/toTableSuggestion';
import { findTable } from '../lookup/findTable';
import { isSameName } from '../lookup/isSameName';

export function suggestAfterQualifier(
  request: CompletionRequest,
  namespace: string | undefined,
  qualifier: string,
  references: readonly TableReference[],
  allTables: readonly TableDefinition[],
): CompletionSuggestion[] {
  if (namespace) {
    return suggestColumns(request.kind, findTable(allTables, { namespace, name: qualifier }));
  }
  const reference = references.find((candidate) => isSameName(candidate.alias, qualifier) || isSameName(candidate.name, qualifier));
  const target = findTable(allTables, reference ?? { name: qualifier });
  if (target) {
    return suggestColumns(request.kind, target);
  }
  const schema = request.schemas.find((candidate) => isSameName(candidate.namespace, qualifier));
  return schema ? schema.tables.map((table) => toTableSuggestion(table, quoteIfNeeded(request.kind, table.name))) : [];
}
