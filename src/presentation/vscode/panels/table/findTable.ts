import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export function findTable(schema: NamespaceSchema, tableName: string): TableDefinition {
  const table = schema.tables.find((candidate) => candidate.name === tableName);
  if (!table) {
    throw new Error(l10n.t('The table {0} was not found. Refresh the view.', tableName));
  }
  return table;
}
