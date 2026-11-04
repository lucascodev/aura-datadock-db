import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteIfNeeded } from '../../../sql/building/quoteIfNeeded';
import type { CompletionRequest } from '../../model/CompletionRequest';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';
import { toTableSuggestion } from './toTableSuggestion';

export function suggestTables(request: CompletionRequest, tables: readonly TableDefinition[]): CompletionSuggestion[] {
  return tables.map((table) => {
    const unqualified = quoteIfNeeded(request.kind, table.name);
    const insertText = table.namespace === request.defaultNamespace ? unqualified : `${quoteIfNeeded(request.kind, table.namespace)}.${unqualified}`;
    return toTableSuggestion(table, insertText);
  });
}
