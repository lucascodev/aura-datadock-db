import type { CellValues, RowChange } from '../model/RowChange';
import { rowKeyId } from './rowKeyId';
import { isMarkedForDeletion } from './isMarkedForDeletion';
import { hasKey } from './hasKey';

export function toggleDeletion(changes: readonly RowChange[], key: CellValues): RowChange[] {
  const keyId = rowKeyId(key);
  const others = changes.filter((change) => !hasKey(change, keyId));
  return isMarkedForDeletion(changes, key) ? others : [...others, { type: 'delete', key }];
}
