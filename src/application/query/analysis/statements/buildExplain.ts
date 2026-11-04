const EXPLAIN_PREFIX = /^\s*explain\b/i;

export function buildExplain(statement: string): string {
  return EXPLAIN_PREFIX.test(statement) ? statement : `EXPLAIN ${statement}`;
}
