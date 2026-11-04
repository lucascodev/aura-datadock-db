import { formatValue } from '../../../../application/format/text/formatValue';
import type { StatementOutcome } from '../../../../application/query/model/StatementOutcome';
import type { QueryResult } from '../../../../domain/database/model/QueryResult';
import type { ResultColumnView, ResultSetView } from '../../../contracts/ResultsMessages';

export function toResultSetView(outcome: StatementOutcome): ResultSetView {
  if (outcome.status === 'failure') {
    return { status: 'error', sql: outcome.sql, message: outcome.message };
  }

  const { result, sql } = outcome;
  if (result.columns.length === 0) {
    return { status: 'command', sql, affectedRows: result.affectedRows ?? 0, durationMs: result.durationMs };
  }

  return {
    status: 'rows',
    sql,
    columns: result.columns.map((name, index) => toColumnView(name, index, result)),
    rows: result.rows.map((row) => row.map((value) => (value === null || value === undefined ? null : formatValue(value)))),
    isTruncated: result.truncated,
    durationMs: result.durationMs,
  };
}

function toColumnView(name: string, index: number, result: QueryResult): ResultColumnView {
  const values = result.rows.map((row) => row[index]).filter((value) => value !== null && value !== undefined);
  return { name, isNumeric: values.length > 0 && values.every(isNumericValue) };
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return true;
  }
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}
