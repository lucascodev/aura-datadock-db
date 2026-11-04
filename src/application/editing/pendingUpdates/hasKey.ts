import type { RowChange } from '../model/RowChange';
import { rowKeyId } from './rowKeyId';

export function hasKey(change: RowChange, keyId: string): boolean {
  return change.type !== 'insert' && rowKeyId(change.key) === keyId;
}
