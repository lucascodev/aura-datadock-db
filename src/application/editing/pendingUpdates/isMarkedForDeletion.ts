import type { CellValues, RowChange } from '../model/RowChange';
import { rowKeyId } from './rowKeyId';
import { hasKey } from './hasKey';

export function isMarkedForDeletion(changes: readonly RowChange[], key: CellValues): boolean {
  const keyId = rowKeyId(key);
  return changes.some((change) => change.type === 'delete' && hasKey(change, keyId));
}
