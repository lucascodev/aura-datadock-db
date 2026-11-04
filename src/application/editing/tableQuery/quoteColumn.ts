import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function quoteColumn(table: TableDefinition, kind: DriverId, name: string): string {
  if (!table.columns.some((column) => column.name === name)) {
    throw new Error(l10n.t('The column {0} does not exist in {1}.', name, table.name));
  }
  return quoteIdentifier(kind, name);
}
