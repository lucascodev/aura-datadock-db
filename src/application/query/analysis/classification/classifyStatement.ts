import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { RiskVerdict } from '../../model/RiskVerdict';
import { classifyReadCalls } from './classifyReadCalls';

const READ_KEYWORDS = new Set(['select', 'with', 'show', 'explain', 'describe', 'desc', 'values', 'table']);
const SCHEMA_CHANGING_KEYWORDS = new Set(['drop', 'truncate', 'alter']);
const ROW_CHANGING_KEYWORDS = new Set(['delete', 'update']);
const WRITE_INSIDE_READ = /\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|into)\b/;
const WHERE_CLAUSE = /\bwhere\b/;

export function classifyStatement(statement: string, serverSideCall: RegExp): RiskVerdict {
  const keyword = statement.split(' ')[0];
  const label = keyword.toUpperCase();

  if (READ_KEYWORDS.has(keyword)) {
    if (WRITE_INSIDE_READ.test(statement)) {
      return { risk: 'write', reason: l10n.t('{0} statement contains a write operation', label) };
    }
    return classifyReadCalls(statement, serverSideCall);
  }

  if (SCHEMA_CHANGING_KEYWORDS.has(keyword)) {
    return { risk: 'destructive', reason: l10n.t('{0} changes or removes database objects', label) };
  }

  if (ROW_CHANGING_KEYWORDS.has(keyword) && !WHERE_CLAUSE.test(statement)) {
    return { risk: 'destructive', reason: l10n.t('{0} without WHERE affects every row', label) };
  }

  return { risk: 'write' };
}
