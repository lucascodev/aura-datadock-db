import type { DriverId } from '../../../domain/driver/DriverId';
import type { TableColumn } from '../../../domain/schema/TableColumn';
import type { TableDefinition } from '../../../domain/schema/TableDefinition';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { l10n } from '../../../domain/i18n/l10n';
import type { TableEditability } from './TableEditability';

const NOT_EDITABLE: TableEditability = { canInsert: false, canUpdate: false, canDelete: false };

export function describeEditability(table: TableDefinition, kind: DriverId, isReadOnly: boolean): TableEditability {
  if (isReadOnly) {
    return { ...NOT_EDITABLE, notice: l10n.t('This connection is read-only, so the data cannot be changed.') };
  }
  if (table.kind === 'view') {
    return { ...NOT_EDITABLE, notice: l10n.t('This is a view, so its data cannot be changed here.') };
  }
  if (table.primaryKey.length === 0) {
    return { canInsert: true, canUpdate: false, canDelete: false, notice: l10n.t('This table has no primary key: rows can be added, but not edited or deleted, because a row cannot be identified safely. The order of the rows may also change between pages.') };
  }
  if (hasBinaryKeyColumn(table, kind)) {
    return { canInsert: true, canUpdate: false, canDelete: false, notice: l10n.t('The primary key of this table has a binary column: rows can be added, but not edited or deleted here.') };
  }
  return { canInsert: true, canUpdate: true, canDelete: true };
}

export function isColumnEditable(column: TableColumn, kind: DriverId): boolean {
  const isAlwaysGenerated = column.generationClause?.includes('ALWAYS') ?? false;
  return !column.isComputed && !isAlwaysGenerated && !getDriver(kind).dialect.isBinaryType(column.dataType);
}

function hasBinaryKeyColumn(table: TableDefinition, kind: DriverId): boolean {
  const { isBinaryType } = getDriver(kind).dialect;
  return table.columns.some((column) => column.isPrimaryKey && isBinaryType(column.dataType));
}
