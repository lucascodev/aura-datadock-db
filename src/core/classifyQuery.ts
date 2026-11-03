import { splitStatements } from './splitStatements';

export type QueryRisk = 'read' | 'write' | 'destructive';

export interface QueryClassification {
  readonly risk: QueryRisk;
  readonly reasons: string[];
  readonly statementCount: number;
}

const RISK_ORDER: readonly QueryRisk[] = ['read', 'write', 'destructive'];
const READ_KEYWORDS = new Set(['select', 'with', 'show', 'explain', 'describe', 'desc', 'values', 'table']);
const SCHEMA_CHANGING_KEYWORDS = new Set(['drop', 'truncate', 'alter']);
const ROW_CHANGING_KEYWORDS = new Set(['delete', 'update']);
const WRITE_INSIDE_READ = /\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|into)\b/;
const WHERE_CLAUSE = /\bwhere\b/;

export function classifyQuery(sql: string): QueryClassification {
  const statements = splitStatements(sql);
  const reasons: string[] = [];
  const risk = statements
    .map((statement) => classifyStatement(normalize(statement), reasons))
    .reduce<QueryRisk>(highestRisk, 'read');

  return { risk, reasons, statementCount: statements.length };
}

function classifyStatement(statement: string, reasons: string[]): QueryRisk {
  const keyword = statement.split(' ')[0];
  const label = keyword.toUpperCase();

  if (READ_KEYWORDS.has(keyword)) {
    if (!WRITE_INSIDE_READ.test(statement)) {
      return 'read';
    }
    reasons.push(`${label} statement contains a write operation`);
    return 'write';
  }

  if (SCHEMA_CHANGING_KEYWORDS.has(keyword)) {
    reasons.push(`${label} changes or removes database objects`);
    return 'destructive';
  }

  if (ROW_CHANGING_KEYWORDS.has(keyword) && !WHERE_CLAUSE.test(statement)) {
    reasons.push(`${label} without WHERE affects every row`);
    return 'destructive';
  }

  return 'write';
}

function normalize(statement: string): string {
  return statement.toLowerCase().replace(/\s+/g, ' ').trim();
}

function highestRisk(a: QueryRisk, b: QueryRisk): QueryRisk {
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(a), RISK_ORDER.indexOf(b))];
}
