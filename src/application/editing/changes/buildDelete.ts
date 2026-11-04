import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import { SINGLE_ROW } from '../constants/singleRow';
import type { CellValues } from '../model/RowChange';
import { toStatement } from '../../sql/building/toStatement';
import { whereKey } from './whereKey';

export function buildDelete(table: TableDefinition, kind: DriverId, key: CellValues): ParameterizedStatement {
  return toStatement(kind, [`DELETE FROM ${quoteTable(kind, table)} WHERE `, ...whereKey(table, kind, key)], SINGLE_ROW);
}
