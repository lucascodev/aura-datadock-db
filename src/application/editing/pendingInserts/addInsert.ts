import type { RowChange } from '../model/RowChange';

export function addInsert(changes: readonly RowChange[], id: string): RowChange[] {
  return [...changes, { type: 'insert', id, values: {} }];
}
