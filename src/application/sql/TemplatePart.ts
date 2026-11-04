import type { CellValue } from '../../domain/database/ParameterizedStatement';

export interface BoundValue {
  readonly value: CellValue;
}

export type TemplatePart = string | BoundValue;
