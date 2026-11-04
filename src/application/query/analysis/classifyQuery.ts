import type { DriverId } from '../../../domain/driver/DriverId';
import { getDriver, listDrivers } from '../../../drivers/catalog/driverCatalog';
import { splitStatements } from './splitStatements';
import { l10n } from '../../../domain/i18n/l10n';

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
const QUOTED_FUNCTION_CALL = /_identifier_\s*\(/;

export function classifyQuery(sql: string, kind?: DriverId): QueryClassification {
  const statements = splitStatements(sql, kind);
  const reasons: string[] = [];
  const serverSideCall = buildServerSideCallPattern(kind);
  const risk = statements
    .map((statement) => classifyStatement(normalize(statement), serverSideCall, reasons))
    .reduce<QueryRisk>(highestRisk, 'read');

  return { risk, reasons, statementCount: statements.length };
}

function buildServerSideCallPattern(kind?: DriverId): RegExp {
  const names = kind ? getDriver(kind).dialect.serverSideFunctions : listDrivers().flatMap((driver) => driver.dialect.serverSideFunctions);
  return names.length > 0 ? new RegExp(`\\b(${names.join('|')})\\s*\\(`) : /$^/;
}

function classifyStatement(statement: string, serverSideCall: RegExp, reasons: string[]): QueryRisk {
  const keyword = statement.split(' ')[0];
  const label = keyword.toUpperCase();

  if (READ_KEYWORDS.has(keyword)) {
    if (WRITE_INSIDE_READ.test(statement)) {
      reasons.push(l10n.t('{0} statement contains a write operation', label));
      return 'write';
    }
    return classifyReadCalls(statement, serverSideCall, reasons);
  }

  if (SCHEMA_CHANGING_KEYWORDS.has(keyword)) {
    reasons.push(l10n.t('{0} changes or removes database objects', label));
    return 'destructive';
  }

  if (ROW_CHANGING_KEYWORDS.has(keyword) && !WHERE_CLAUSE.test(statement)) {
    reasons.push(l10n.t('{0} without WHERE affects every row', label));
    return 'destructive';
  }

  return 'write';
}

function classifyReadCalls(statement: string, serverSideCall: RegExp, reasons: string[]): QueryRisk {
  const call = serverSideCall.exec(statement);
  if (call) {
    reasons.push(l10n.t('{0} can change the server or read its files', call[1]));
    return 'write';
  }
  if (QUOTED_FUNCTION_CALL.test(statement)) {
    reasons.push(l10n.t('A function called by a quoted name may change the server, so it counts as a write'));
    return 'write';
  }
  return 'read';
}

function normalize(statement: string): string {
  return statement.toLowerCase().replace(/\s+/g, ' ').trim();
}

function highestRisk(a: QueryRisk, b: QueryRisk): QueryRisk {
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(a), RISK_ORDER.indexOf(b))];
}
