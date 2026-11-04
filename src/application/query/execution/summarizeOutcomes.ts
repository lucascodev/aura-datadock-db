import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { QueryHistoryEntry } from '../history/QueryHistoryEntry';
import type { StatementOutcome } from './StatementOutcome';

export function summarizeOutcomes(
  sql: string,
  target: Pick<ConnectionTarget, 'key' | 'name'>,
  executedAt: number,
  outcomes: readonly StatementOutcome[],
): QueryHistoryEntry {
  const failure = outcomes.find((outcome) => outcome.status === 'failure');
  const lastSuccess = outcomes.filter((outcome) => outcome.status === 'success').at(-1);

  return {
    sql,
    connectionKey: target.key,
    connectionName: target.name,
    executedAt,
    durationMs: outcomes.reduce((total, outcome) => total + (outcome.status === 'success' ? outcome.result.durationMs : 0), 0),
    rowCount: lastSuccess?.status === 'success' ? (lastSuccess.result.affectedRows ?? lastSuccess.result.rows.length) : undefined,
    errorMessage: failure?.status === 'failure' ? failure.message : undefined,
  };
}
