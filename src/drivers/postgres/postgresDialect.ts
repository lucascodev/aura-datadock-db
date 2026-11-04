import type { SqlDialect } from '../../domain/driver/SqlDialect';

export const postgresDialect: SqlDialect = {
  identifierQuote: '"',
  plainIdentifier: /^[a-z_][a-z0-9_$]*$/,
  hasHashComments: false,
  hasDollarQuotes: true,
  backslashEscapes: 'escape-strings-only',
  stringLiteralEscapesBackslash: false,
  assistantName: 'PostgreSQL',
  commonTypes: ['text', 'varchar(255)', 'integer', 'bigint', 'numeric(10, 2)', 'boolean', 'date', 'timestamptz', 'uuid', 'jsonb', 'bytea'],
  autoIncrementPrimaryKey: 'bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
  insertAllDefaults: 'DEFAULT VALUES',
  caseInsensitiveLike: 'ILIKE',
  placeholder: (position) => `$${position}`,
  binaryLiteral: (hex) => `'\\x${hex}'`,
  castToText: (column) => `CAST(${column} AS TEXT)`,
  isBinaryType: (dataType) => dataType === 'bytea',
  renameTable: (table, _namespace, newName) => `ALTER TABLE ${table} RENAME TO ${newName}`,
};
