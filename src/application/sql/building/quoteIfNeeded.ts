import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { quoteIdentifier } from '../../../drivers/catalog/quoteIdentifier';
import { SQL_KEYWORDS } from '../../completion/constants/sqlKeywords';

const RESERVED_WORDS = new Set(SQL_KEYWORDS.map((keyword) => keyword.toLowerCase()));

export function quoteIfNeeded(kind: DriverId, identifier: string): string {
  const isPlain = getDriver(kind).dialect.plainIdentifier.test(identifier) && !RESERVED_WORDS.has(identifier.toLowerCase());
  return isPlain ? identifier : quoteIdentifier(kind, identifier);
}
