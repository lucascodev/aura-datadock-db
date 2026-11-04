export type QueryRisk = 'read' | 'write' | 'destructive';

export interface QueryClassification {
  readonly risk: QueryRisk;
  readonly reasons: string[];
  readonly statementCount: number;
}
