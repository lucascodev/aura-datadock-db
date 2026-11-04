import { scanStatements } from './scanStatements';

export function summarizeSql(sql: string, maxCharacters: number): string {
  const firstStatement = scanStatements(sql)[0]?.text ?? sql;
  const flat = firstStatement.replace(/\s+/g, ' ').trim();
  return flat.length > maxCharacters ? `${flat.slice(0, maxCharacters)}…` : flat;
}
