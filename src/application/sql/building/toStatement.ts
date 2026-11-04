import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { CellValue, ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import { getDriver } from '../../../drivers/catalog/getDriver';
import { toSqlLiteral } from './toSqlLiteral';
import type { TemplatePart } from '../model/TemplatePart';

export function toStatement(kind: DriverId, parts: readonly TemplatePart[], expectedRows?: number): ParameterizedStatement {
  const { placeholder } = getDriver(kind).dialect;
  const params: CellValue[] = [];

  const sql = parts
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      params.push(part.value);
      return placeholder(params.length);
    })
    .join('');
  const preview = parts.map((part) => (typeof part === 'string' ? part : toSqlLiteral(kind, part.value))).join('');

  return { sql, params, preview, expectedRows };
}
