import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { getDriver } from '../../../drivers/catalog/getDriver';
import { bound } from '../../sql/building/bound';
import { joinParts } from '../../sql/building/joinParts';
import type { TemplatePart } from '../../sql/model/TemplatePart';
import type { TableFilter, TableRowSelection } from '../model/tableFilters';
import { validateWhereExpression } from '../browsing/validateWhereExpression';
import { quoteColumn } from './quoteColumn';

export function buildWhere(table: TableDefinition, kind: DriverId, selection: TableRowSelection): TemplatePart[] {
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

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}
