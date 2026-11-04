const NUMERIC_LITERAL = /^-?\d+(\.\d+)?$/;
const FUNCTION_CALL = /^[A-Za-z_]\w*\(.*\)$/;
const QUOTED_LITERAL = /^'.*'$/s;
const GENERATED_DEFAULT_MARKER = 'DEFAULT_GENERATED';
const MARIADB_NULL_LITERAL = 'NULL';

export function normalizeMysqlDefault(value: string | null, extra: string): string | undefined {
  if (value === null || value === MARIADB_NULL_LITERAL) {
    return undefined;
  }
  if (extra.includes(GENERATED_DEFAULT_MARKER) || NUMERIC_LITERAL.test(value) || FUNCTION_CALL.test(value) || QUOTED_LITERAL.test(value)) {
    return value;
  }
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}
