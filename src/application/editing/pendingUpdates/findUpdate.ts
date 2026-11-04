import type { CellValues, RowChange } from '../model/RowChange';
import { rowKeyId } from './rowKeyId';
import { hasKey } from './hasKey';

export function findUpdate(changes: readonly RowChange[], key: CellValues): Extract<RowChange, { type: 'update' }> | undefined {
  const keyId = rowKeyId(key);
  return changes.find((change): change is Extract<RowChange, { type: 'update' }> => change.type === 'update' && hasKey(change, keyId));
}
