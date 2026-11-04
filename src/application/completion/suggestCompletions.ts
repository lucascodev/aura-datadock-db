import type { DriverId } from '../../domain/driver/DriverId';
import type { NamespaceSchema } from '../../domain/schema/NamespaceSchema';
import type { TableDefinition } from '../../domain/schema/TableDefinition';
import { quoteIfNeeded } from '../sql/quoteIfNeeded';
import { statementAtOffset } from '../query/analysis/statementAtOffset';
import { scanStatements } from '../query/analysis/splitStatements';
import type { CompletionSuggestion } from './CompletionSuggestion';
import { parseTableReferences, unquote, type TableReference } from './parseTableReferences';
import { SQL_KEYWORDS } from './sqlKeywords';

export interface CompletionRequest {
  readonly sql: string;
  readonly offset: number;
  readonly kind: DriverId;
  readonly schemas: readonly NamespaceSchema[];
  readonly defaultNamespace?: string;
}

const IDENTIFIER = '(?:"[^"]+"|`[^`]+`|[A-Za-z_][\\w$]*)';
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

function suggestAfterQualifier(
  request: CompletionRequest,
  namespace: string | undefined,
  qualifier: string,
  references: readonly TableReference[],
  allTables: readonly TableDefinition[],
): CompletionSuggestion[] {
  if (namespace) {
    return suggestColumns(request.kind, findTable(allTables, { namespace, name: qualifier }));
  }
  const reference = references.find((candidate) => isSameName(candidate.alias, qualifier) || isSameName(candidate.name, qualifier));
  const target = findTable(allTables, reference ?? { name: qualifier });
  if (target) {
    return suggestColumns(request.kind, target);
  }
  const schema = request.schemas.find((candidate) => isSameName(candidate.namespace, qualifier));
  return schema ? schema.tables.map((table) => toTableSuggestion(table, name(request.kind, table.name))) : [];
}

function suggestTables(request: CompletionRequest, tables: readonly TableDefinition[]): CompletionSuggestion[] {
  return tables.map((table) => {
    const unqualified = name(request.kind, table.name);
    const insertText = table.namespace === request.defaultNamespace ? unqualified : `${name(request.kind, table.namespace)}.${unqualified}`;
    return toTableSuggestion(table, insertText);
  });
}

function toTableSuggestion(table: TableDefinition, insertText: string): CompletionSuggestion {
  return { label: table.name, kind: table.kind, detail: table.namespace, insertText };
}

function suggestNamespaces(request: CompletionRequest): CompletionSuggestion[] {
  return request.schemas.map((schema) => ({
    label: schema.namespace,
    kind: 'namespace',
    insertText: name(request.kind, schema.namespace),
  }));
}

function suggestColumns(kind: DriverId, table: TableDefinition | undefined, source?: string): CompletionSuggestion[] {
  if (!table) {
    return [];
  }
  return table.columns.map((column) => ({
    label: column.name,
    kind: 'column',
    detail: source ? `${source} · ${column.dataType}` : column.dataType,
    insertText: name(kind, column.name),
  }));
}

function suggestKeywords(): CompletionSuggestion[] {
  return SQL_KEYWORDS.map((keyword) => ({ label: keyword, kind: 'keyword', insertText: keyword }));
}

function findTable(tables: readonly TableDefinition[], reference: Pick<TableReference, 'namespace' | 'name'>): TableDefinition | undefined {
  return tables.find(
    (table) => isSameName(table.name, reference.name) && (reference.namespace === undefined || isSameName(table.namespace, reference.namespace)),
  );
}

function isSameName(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function name(kind: DriverId, identifier: string): string {
  return quoteIfNeeded(kind, identifier);
}
