import type { ColumnKind } from '../../model/config/ColumnKind';
import { axisPosition } from './axisPosition';

export function orderLabels(kind: ColumnKind, labels: readonly string[]): string[] {
  if (kind === 'category') {
    return [...labels];
  }
  return [...labels].sort((left, right) => (axisPosition(kind, left) ?? 0) - (axisPosition(kind, right) ?? 0));
}
