import type { CellValue } from '../../domain/database/model/ParameterizedStatement';

export interface BoundValue {
  readonly value: CellValue;
}

export type TemplatePart = string | BoundValue;
