import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import type { StatementOutcome } from './StatementOutcome';

interface RunStatementsOptions {
  readonly maxRows: number;
  readonly signal?: AbortSignal;
}

export async function runStatements(
  runner: Pick<DatabaseAdapter, 'runQuery'>,
  statements: readonly string[],
  options: RunStatementsOptions,
): Promise<StatementOutcome[]> {
  const outcomes: StatementOutcome[] = [];

  for (const sql of statements) {
    if (options.signal?.aborted) {
      return outcomes;
    }
    try {
      outcomes.push({ status: 'success', sql, result: await runner.runQuery(sql, options.maxRows) });
    } catch (error) {
      outcomes.push({ status: 'failure', sql, message: error instanceof Error ? error.message : String(error) });
      return outcomes;
    }
  }

  return outcomes;
}
