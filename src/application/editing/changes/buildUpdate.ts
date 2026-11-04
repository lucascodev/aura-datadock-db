import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import { l10n } from '../../../domain/i18n/translation/l10n';
import { SINGLE_ROW } from '../constants/singleRow';
import type { CellValues } from '../model/RowChange';
import { bound } from '../../sql/building/bound';
import { joinParts } from '../../sql/building/joinParts';
import { toStatement } from '../../sql/building/toStatement';
import type { TemplatePart } from '../../sql/model/TemplatePart';
import { editableValues } from './editableValues';
import { whereKey } from './whereKey';

export function buildUpdate(table: TableDefinition, kind: DriverId, key: CellValues, values: CellValues): ParameterizedStatement {
  const assignments = Object.entries(editableValues(table, kind, values)).map(([column, value]): TemplatePart[] => [`${quoteIdentifier(kind, column)} = `, bound(value)]);
  if (assignments.length === 0) {
    throw new Error(l10n.t('There is nothing to change in this row.'));
  }
  return toStatement(kind, [`UPDATE ${quoteTable(kind, table)} SET `, ...joinParts(assignments, ', '), ' WHERE ', ...whereKey(table, kind, key)], SINGLE_ROW);
}
