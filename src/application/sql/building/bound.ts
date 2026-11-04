import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { BoundValue } from '../model/TemplatePart';

export function bound(value: CellValue): BoundValue {
  return { value };
}
