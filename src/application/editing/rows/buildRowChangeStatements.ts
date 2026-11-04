import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import { describeEditability, isColumnEditable } from './describeEditability';
import type { CellValues, RowChange } from './RowChange';
import { bound, joinParts, toStatement } from '../../sql/statementTemplate';
import type { TemplatePart } from '../../sql/TemplatePart';
import { l10n } from '../../../domain/i18n/translation/l10n';

const SINGLE_ROW = 1;
const CHANGE_ORDER: readonly RowChange['type'][] = ['delete', 'update', 'insert'];

export function buildRowChangeStatements(table: TableDefinition, kind: DriverId, isReadOnly: boolean, changes: readonly RowChange[]): ParameterizedStatement[] {
  const editability = describeEditability(table, kind, isReadOnly);
  return CHANGE_ORDER.flatMap((type) => changes.filter((change) => change.type === type)).map((change) => {
    switch (change.type) {
      case 'delete':
        assertAllowed(editability.canDelete, editability.notice);
        return buildDelete(table, kind, change.key);
      case 'update':
        assertAllowed(editability.canUpdate, editability.notice);
        return buildUpdate(table, kind, change.key, change.values);
      case 'insert':
        assertAllowed(editability.canInsert, editability.notice);
        return buildInsert(table, kind, change.values);
    }
  });
}

function assertAllowed(isAllowed: boolean, reason: string | undefined): void {
  if (!isAllowed) {
    throw new Error(reason ?? l10n.t('This change is not allowed.'));
  }
}

function buildDelete(table: TableDefinition, kind: DriverId, key: CellValues): ParameterizedStatement {
  return toStatement(kind, [`DELETE FROM ${quoteTable(kind, table)} WHERE `, ...whereKey(table, kind, key)], SINGLE_ROW);
}

function buildUpdate(table: TableDefinition, kind: DriverId, key: CellValues, values: CellValues): ParameterizedStatement {
  const assignments = Object.entries(editableValues(table, kind, values)).map(([column, value]): TemplatePart[] => [`${quoteIdentifier(kind, column)} = `, bound(value)]);
  if (assignments.length === 0) {
    throw new Error(l10n.t('There is nothing to change in this row.'));
  }
  return toStatement(kind, [`UPDATE ${quoteTable(kind, table)} SET `, ...joinParts(assignments, ', '), ' WHERE ', ...whereKey(table, kind, key)], SINGLE_ROW);
}

function buildInsert(table: TableDefinition, kind: DriverId, values: CellValues): ParameterizedStatement {
  const entries = Object.entries(editableValues(table, kind, values));
  const target = `INSERT INTO ${quoteTable(kind, table)} `;
  if (entries.length === 0) {
    return toStatement(kind, [`${target}${getDriver(kind).dialect.insertAllDefaults}`], SINGLE_ROW);
  }
  const columns = entries.map(([column]) => quoteIdentifier(kind, column)).join(', ');
  const placeholders = joinParts(entries.map(([, value]): TemplatePart[] => [bound(value)]), ', ');
  return toStatement(kind, [`${target}(${columns}) VALUES (`, ...placeholders, ')'], SINGLE_ROW);
}

function editableValues(table: TableDefinition, kind: DriverId, values: CellValues): CellValues {
  for (const name of Object.keys(values)) {
    const column = table.columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(l10n.t('The column {0} does not exist in {1}.', name, table.name));
    }
    if (!isColumnEditable(column, kind)) {
      throw new Error(l10n.t('The column {0} cannot be changed.', name));
    }
  }
  return values;
}

function whereKey(table: TableDefinition, kind: DriverId, key: CellValues): TemplatePart[] {
  const conditions = table.primaryKey.map((column): TemplatePart[] => {
    const value = key[column];
    if (value === undefined || value === null) {
      throw new Error(l10n.t('The row is missing the value of the primary key column {0}.', column));
    }
    return [`${quoteIdentifier(kind, column)} = `, bound(value)];
  });
  return joinParts(conditions, ' AND ');
}
