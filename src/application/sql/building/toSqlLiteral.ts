import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';

export function toSqlLiteral(kind: DriverId, value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (Buffer.isBuffer(value)) {
    return getDriver(kind).dialect.binaryLiteral(value.toString('hex'));
  }
  if (value instanceof Date) {
    return quoteString(kind, value.toISOString());
  }
  return quoteString(kind, typeof value === 'object' ? JSON.stringify(value) : String(value));
}

function quoteString(kind: DriverId, text: string): string {
  const escaped = getDriver(kind).dialect.stringLiteralEscapesBackslash ? text.replace(/\\/g, '\\\\') : text;
  return `'${escaped.replace(/'/g, "''")}'`;
}
