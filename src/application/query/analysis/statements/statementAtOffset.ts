import type { SqlStatement } from '../../model/SqlStatement';

export function statementAtOffset(statements: readonly SqlStatement[], offset: number): SqlStatement | undefined {
  const containing = statements.find((statement) => offset >= statement.start && offset <= statement.terminatorEnd);
  if (containing) {
    return containing;
  }
  const previous = statements.filter((statement) => statement.terminatorEnd < offset).at(-1);
  return previous ?? statements.find((statement) => statement.start > offset);
}
