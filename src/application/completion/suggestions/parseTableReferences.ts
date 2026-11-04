import type { TableReference } from '../model/TableReference';
import { IDENTIFIER } from '../constants/sqlIdentifierPattern';
import { RESERVED_WORDS } from '../../sql/constants/reservedWords';

const TABLE_REFERENCE = new RegExp(
  `\\b(?:from|join|update|into)\\s+(${IDENTIFIER})(?:\\s*\\.\\s*(${IDENTIFIER}))?(?:\\s+(?:as\\s+)?(${IDENTIFIER}))?`,
  'gi',
);

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
