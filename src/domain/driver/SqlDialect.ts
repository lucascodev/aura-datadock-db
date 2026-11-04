export type BackslashEscapes = 'all-strings' | 'escape-strings-only';

export interface SqlDialect {
  readonly identifierQuote: string;
  readonly plainIdentifier: RegExp;
  readonly hasHashComments: boolean;
  readonly hasDollarQuotes: boolean;
  readonly backslashEscapes: BackslashEscapes;
  readonly stringLiteralEscapesBackslash: boolean;
  readonly assistantName: string;
  readonly commonTypes: readonly string[];
  readonly autoIncrementPrimaryKey: string;
  readonly insertAllDefaults: string;
  readonly caseInsensitiveLike: string;
  placeholder(position: number): string;
  binaryLiteral(hex: string): string;
  castToText(column: string): string;
  isBinaryType(dataType: string): boolean;
  renameTable(table: string, namespace: string, newName: string): string;
}
