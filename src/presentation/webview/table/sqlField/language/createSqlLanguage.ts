import { SQLDialect, sql } from '@codemirror/lang-sql';
import type { LanguageSupport } from '@codemirror/language';
import type { DriverId } from '../../../../../domain/driver/model/DriverId';
import { getDriver } from '../../../../../drivers/catalog/getDriver';

export function createSqlLanguage(kind: DriverId): LanguageSupport {
  const { identifierQuote, hasHashComments, hasDollarQuotes, backslashEscapes } = getDriver(kind).dialect;
  return sql({
    dialect: SQLDialect.define({
      identifierQuotes: identifierQuote,
      hashComments: hasHashComments,
      doubleDollarQuotedStrings: hasDollarQuotes,
      backslashEscapes: backslashEscapes === 'all-strings',
    }),
  });
}
