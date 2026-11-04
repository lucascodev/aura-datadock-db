import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { RESERVED_WORDS } from '../constants/reservedWords';


export function quoteIfNeeded(kind: DriverId, identifier: string): string {
  const isPlain = getDriver(kind).dialect.plainIdentifier.test(identifier) && !RESERVED_WORDS.has(identifier.toLowerCase());
  return isPlain ? identifier : quoteIdentifier(kind, identifier);
}
