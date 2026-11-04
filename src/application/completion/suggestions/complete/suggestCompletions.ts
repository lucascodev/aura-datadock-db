import { statementAtOffset } from '../../../query/analysis/statements/statementAtOffset';
import { scanStatements } from '../../../query/analysis/statements/scanStatements';
import type { CompletionRequest } from '../../model/CompletionRequest';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';
import { IDENTIFIER } from '../../constants/sqlIdentifierPattern';
import { suggestColumns } from '../candidates/suggestColumns';
import { suggestKeywords } from '../candidates/suggestKeywords';
import { suggestNamespaces } from '../candidates/suggestNamespaces';
import { suggestTables } from '../candidates/suggestTables';
import { findTable } from '../lookup/findTable';
import { parseTableReferences } from '../lookup/parseTableReferences';
import { unquote } from '../lookup/unquote';
import { suggestAfterQualifier } from './suggestAfterQualifier';

const QUALIFIED_TAIL = new RegExp(`(?:(${IDENTIFIER})\\s*\\.\\s*)?(${IDENTIFIER})\\s*\\.\\s*[\\w$]*$`);
const TABLE_POSITION_TAIL = /\b(?:from|join|update|into|table)\s+[\w$]*$/i;

export function suggestCompletions(request: CompletionRequest): CompletionSuggestion[] {
  const statement = statementAtOffset(scanStatements(request.sql, request.kind), request.offset);
  const statementStart = statement && request.offset >= statement.start ? statement.start : request.offset;
  const before = request.sql.slice(statementStart, request.offset);
  const references = parseTableReferences(statement?.text ?? before);
  const allTables = request.schemas.flatMap((schema) => schema.tables);

  const qualified = QUALIFIED_TAIL.exec(before);
  if (qualified) {
    const namespace = qualified[1] ? unquote(qualified[1]) : undefined;
    return suggestAfterQualifier(request, namespace, unquote(qualified[2]), references, allTables);
  }
  if (TABLE_POSITION_TAIL.test(before)) {
    return [...suggestTables(request, allTables), ...suggestNamespaces(request)];
  }
  return [
    ...references.flatMap((reference) => suggestColumns(request.kind, findTable(allTables, reference), reference.alias ?? reference.name)),
    ...suggestTables(request, allTables),
    ...suggestKeywords(),
  ];
}
