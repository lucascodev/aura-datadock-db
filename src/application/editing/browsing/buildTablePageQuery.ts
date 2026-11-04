import type { DriverId } from '../../../domain/driver/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/TableDefinition';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import { bound, joinParts, toStatement, type TemplatePart } from '../../sql/statementTemplate';
import type { TableFilter, TablePageRequest, TableRowSelection } from './tableFilters';
import { validateWhereExpression } from './validateWhereExpression';
import { l10n } from '../../../domain/i18n/l10n';

export interface TablePageQuery {
  readonly page: ParameterizedStatement;
  readonly count: ParameterizedStatement;
}

export function buildTablePageQuery(table: TableDefinition, kind: DriverId, request: TablePageRequest): TablePageQuery {
  assertRowWindow(request.offset, request.limit);
  const from = quoteTable(kind, table);
  const where = buildWhere(table, kind, request);

  return {
    page: toStatement(kind, [`SELECT * FROM ${from}`, ...where, buildOrderBy(table, kind, request), ` LIMIT ${request.limit} OFFSET ${request.offset}`]),
    count: toStatement(kind, [`SELECT COUNT(*) FROM ${from}`, ...where]),
  };
}

export function buildTableSelect(table: TableDefinition, kind: DriverId, selection: TableRowSelection): ParameterizedStatement {
  return toStatement(kind, [`SELECT * FROM ${quoteTable(kind, table)}`, ...buildWhere(table, kind, selection), buildOrderBy(table, kind, selection)]);
}

function assertRowWindow(offset: number, limit: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(l10n.t('Invalid page of rows.'));
  }
}

function buildWhere(table: TableDefinition, kind: DriverId, selection: TableRowSelection): TemplatePart[] {
  const conditions = selection.filters.map((filter) => buildCondition(table, kind, filter));
  const expression = selection.whereExpression?.trim();
  if (expression) {
    validateWhereExpression(kind, expression);
    conditions.unshift([`(\n${expression}\n)`]);
  }
  return conditions.length > 0 ? [' WHERE ', ...joinParts(conditions, ' AND ')] : [];
}

function buildCondition(table: TableDefinition, kind: DriverId, filter: TableFilter): TemplatePart[] {
  const column = quoteColumn(table, kind, filter.column);
  const { caseInsensitiveLike, castToText } = getDriver(kind).dialect;

  switch (filter.operator) {
    case 'equals':
      return [`${column} = `, bound(filter.value)];
    case 'notEquals':
      return [`${column} <> `, bound(filter.value)];
    case 'greaterThan':
      return [`${column} > `, bound(filter.value)];
    case 'lessThan':
      return [`${column} < `, bound(filter.value)];
    case 'contains':
      return [`${castToText(column)} ${caseInsensitiveLike} `, bound(`%${escapeLike(filter.value)}%`)];
    case 'startsWith':
      return [`${castToText(column)} ${caseInsensitiveLike} `, bound(`${escapeLike(filter.value)}%`)];
    case 'isNull':
      return [`${column} IS NULL`];
    case 'isNotNull':
      return [`${column} IS NOT NULL`];
  }
}

function buildOrderBy(table: TableDefinition, kind: DriverId, selection: TableRowSelection): string {
  const sort = selection.sort ? [`${quoteColumn(table, kind, selection.sort.column)} ${selection.sort.isDescending ? 'DESC' : 'ASC'}`] : [];
  const tieBreakers = table.primaryKey.filter((column) => column !== selection.sort?.column).map((column) => quoteIdentifier(kind, column));
  const terms = [...sort, ...tieBreakers];
  return terms.length > 0 ? ` ORDER BY ${terms.join(', ')}` : '';
}

function quoteColumn(table: TableDefinition, kind: DriverId, name: string): string {
  if (!table.columns.some((column) => column.name === name)) {
    throw new Error(l10n.t('The column {0} does not exist in {1}.', name, table.name));
  }
  return quoteIdentifier(kind, name);
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}
