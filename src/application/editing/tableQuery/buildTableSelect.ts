import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import { toStatement } from '../../sql/building/toStatement';
import type { TableRowSelection } from '../model/tableFilters';
import { buildWhere } from './buildWhere';
import { buildOrderBy } from './buildOrderBy';

export function buildTableSelect(table: TableDefinition, kind: DriverId, selection: TableRowSelection): ParameterizedStatement {
  return toStatement(kind, [`SELECT * FROM ${quoteTable(kind, table)}`, ...buildWhere(table, kind, selection), buildOrderBy(table, kind, selection)]);
}
