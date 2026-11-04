import type { DriverId } from '../../domain/driver/model/DriverId';
import { getDriver } from './getDriver';

export function quoteIdentifier(kind: DriverId, identifier: string): string {
  const quote = getDriver(kind).dialect.identifierQuote;
  return `${quote}${identifier.split(quote).join(quote + quote)}${quote}`;
}
