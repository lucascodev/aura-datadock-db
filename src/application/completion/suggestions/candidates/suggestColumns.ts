import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { quoteIfNeeded } from '../../../sql/building/quoteIfNeeded';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';

export function suggestColumns(kind: DriverId, table: TableDefinition | undefined, source?: string): CompletionSuggestion[] {
  if (!table) {
    return [];
  }
  return table.columns.map((column) => ({
    label: column.name,
    kind: 'column',
    detail: source ? `${source} · ${column.dataType}` : column.dataType,
    insertText: quoteIfNeeded(kind, column.name),
  }));
}
