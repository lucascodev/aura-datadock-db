import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { CellValues } from '../model/RowChange';
import { bound } from '../../sql/building/bound';
import { joinParts } from '../../sql/building/joinParts';
import type { TemplatePart } from '../../sql/model/TemplatePart';

export function whereKey(table: TableDefinition, kind: DriverId, key: CellValues): TemplatePart[] {
  const conditions = table.primaryKey.map((column): TemplatePart[] => {
    const value = key[column];
    if (value === undefined || value === null) {
      throw new Error(l10n.t('The row is missing the value of the primary key column {0}.', column));
    }
    return [`${quoteIdentifier(kind, column)} = `, bound(value)];
  });
  return joinParts(conditions, ' AND ');
}
