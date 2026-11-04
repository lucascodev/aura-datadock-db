import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';

export type CellValues = Readonly<Record<string, CellValue>>;

export type RowChange =
  | { readonly type: 'insert'; readonly id: string; readonly values: CellValues }
  | { readonly type: 'update'; readonly key: CellValues; readonly values: CellValues }
  | { readonly type: 'delete'; readonly key: CellValues };
