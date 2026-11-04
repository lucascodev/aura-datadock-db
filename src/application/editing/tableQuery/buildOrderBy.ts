import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import type { TableRowSelection } from '../model/tableFilters';
import { quoteColumn } from './quoteColumn';

export function buildOrderBy(table: TableDefinition, kind: DriverId, selection: TableRowSelection): string {
  const sort = selection.sort ? [`${quoteColumn(table, kind, selection.sort.column)} ${selection.sort.isDescending ? 'DESC' : 'ASC'}`] : [];
  const tieBreakers = table.primaryKey.filter((column) => column !== selection.sort?.column).map((column) => quoteIdentifier(kind, column));
  const terms = [...sort, ...tieBreakers];
  return terms.length > 0 ? ` ORDER BY ${terms.join(', ')}` : '';
}
