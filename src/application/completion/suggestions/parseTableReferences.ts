import { SQL_KEYWORDS } from '../constants/sqlKeywords';
import type { TableReference } from '../model/TableReference';

const IDENTIFIER = '(?:"[^"]+"|`[^`]+`|[A-Za-z_][\\w$]*)';
const TABLE_REFERENCE = new RegExp(
  `\\b(?:from|join|update|into)\\s+(${IDENTIFIER})(?:\\s*\\.\\s*(${IDENTIFIER}))?(?:\\s+(?:as\\s+)?(${IDENTIFIER}))?`,
  'gi',
);
const RESERVED_WORDS = new Set(SQL_KEYWORDS.map((keyword) => keyword.toLowerCase()));

export function parseTableReferences(sql: string): TableReference[] {
  return [...sql.matchAll(TABLE_REFERENCE)].map((match) => {
    const first = unquote(match[1]);
    const second = match[2] ? unquote(match[2]) : undefined;
    const alias = match[3] ? unquote(match[3]) : undefined;
    return {
      namespace: second ? first : undefined,
      name: second ?? first,
      alias: alias && !RESERVED_WORDS.has(alias.toLowerCase()) ? alias : undefined,
    };
  });
}

export function unquote(identifier: string): string {
  const first = identifier[0];
  return first === '"' || first === '`' ? identifier.slice(1, -1) : identifier;
}
