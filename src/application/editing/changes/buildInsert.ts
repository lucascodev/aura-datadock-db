import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { getDriver } from '../../../drivers/catalog/getDriver';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import { SINGLE_ROW } from '../constants/singleRow';
import type { CellValues } from '../model/RowChange';
import { bound } from '../../sql/building/bound';
import { joinParts } from '../../sql/building/joinParts';
import { toStatement } from '../../sql/building/toStatement';
import type { TemplatePart } from '../../sql/model/TemplatePart';
import { editableValues } from './editableValues';

export function buildInsert(table: TableDefinition, kind: DriverId, values: CellValues): ParameterizedStatement {
  const entries = Object.entries(editableValues(table, kind, values));
  const target = `INSERT INTO ${quoteTable(kind, table)} `;
  if (entries.length === 0) {
    return toStatement(kind, [`${target}${getDriver(kind).dialect.insertAllDefaults}`], SINGLE_ROW);
  }
  const columns = entries.map(([column]) => quoteIdentifier(kind, column)).join(', ');
  const placeholders = joinParts(entries.map(([, value]): TemplatePart[] => [bound(value)]), ', ');
  return toStatement(kind, [`${target}(${columns}) VALUES (`, ...placeholders, ')'], SINGLE_ROW);
}
