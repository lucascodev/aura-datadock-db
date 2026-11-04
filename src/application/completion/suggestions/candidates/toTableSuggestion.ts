import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';

export function toTableSuggestion(table: TableDefinition, insertText: string): CompletionSuggestion {
  return { label: table.name, kind: table.kind, detail: table.namespace, insertText };
}
