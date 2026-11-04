import type { SqlDialect } from '../../domain/driver/model/SqlDialect';

const BINARY_TYPE = /^(tiny|medium|long)?blob$|^(var)?binary\b|^bit\b/i;

export const mysqlDialect: SqlDialect = {
  identifierQuote: '`',
  plainIdentifier: /^[A-Za-z_][\w$]*$/,
  hasHashComments: true,
  hasConditionalComments: true,
  serverSideFunctions: ['load_file', 'get_lock', 'release_lock', 'release_all_locks', 'sys_exec', 'sys_eval'],
  hasDollarQuotes: false,
  backslashEscapes: 'all-strings',
  stringLiteralEscapesBackslash: true,
  assistantName: 'MySQL',
  commonTypes: ['varchar(255)', 'text', 'int', 'bigint', 'decimal(10, 2)', 'boolean', 'date', 'datetime', 'timestamp', 'json', 'blob'],
  autoIncrementPrimaryKey: 'bigint AUTO_INCREMENT PRIMARY KEY',
  insertAllDefaults: '() VALUES ()',
  caseInsensitiveLike: 'LIKE',
  placeholder: () => '?',
  binaryLiteral: (hex) => `x'${hex}'`,
  castToText: (column) => `CAST(${column} AS CHAR)`,
  isBinaryType: (dataType) => BINARY_TYPE.test(dataType),
  renameTable: (table, namespace, newName) => `RENAME TABLE ${table} TO ${namespace}.${newName}`,
};
