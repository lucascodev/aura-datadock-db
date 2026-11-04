
export type CellValue = string | null;

export interface ParameterizedStatement {
  readonly sql: string;
  readonly params: readonly CellValue[];
  readonly preview: string;
  readonly expectedRows?: number;
}
