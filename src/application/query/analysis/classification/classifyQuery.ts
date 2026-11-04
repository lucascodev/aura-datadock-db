import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { QueryClassification, QueryRisk } from '../../model/QueryClassification';
import { splitStatements } from '../statements/splitStatements';
import { buildServerSideCallPattern } from './buildServerSideCallPattern';
import { classifyStatement } from './classifyStatement';
import { highestRisk } from './highestRisk';

function normalize(statement: string): string {
  return statement.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function classifyQuery(sql: string, kind?: DriverId): QueryClassification {
  const statements = splitStatements(sql, kind);
  const serverSideCall = buildServerSideCallPattern(kind);
  const verdicts = statements.map((statement) => classifyStatement(normalize(statement), serverSideCall));
  const risk = verdicts.map((verdict) => verdict.risk).reduce<QueryRisk>(highestRisk, 'read');
  const reasons = verdicts.flatMap((verdict) => (verdict.reason ? [verdict.reason] : []));

  return { risk, reasons, statementCount: statements.length };
}
