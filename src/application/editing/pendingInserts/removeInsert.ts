import type { RowChange } from '../model/RowChange';

export function removeInsert(changes: readonly RowChange[], id: string): RowChange[] {
  return changes.filter((change) => !(change.type === 'insert' && change.id === id));
}
