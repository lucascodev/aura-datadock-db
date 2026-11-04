import type { DriverId } from '../../domain/driver/model/DriverId';
import type { CellValue, ParameterizedStatement } from '../../domain/database/model/ParameterizedStatement';
import { getDriver } from '../../drivers/catalog/driverCatalog';
import { toSqlLiteral } from './toSqlLiteral';
import type { BoundValue, TemplatePart } from './TemplatePart';

export function bound(value: CellValue): BoundValue {
  return { value };
}

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

export function joinParts(parts: readonly (readonly TemplatePart[])[], separator: string): TemplatePart[] {
  return parts.flatMap((part, index) => (index === 0 ? [...part] : [separator, ...part]));
}
