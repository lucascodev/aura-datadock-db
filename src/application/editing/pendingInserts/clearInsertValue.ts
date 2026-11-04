import type { RowChange } from '../model/RowChange';

export function clearInsertValue(changes: readonly RowChange[], id: string, column: string): RowChange[] {
  return changes.map((change) => {
    if (change.type !== 'insert' || change.id !== id) {
      return change;
    }
    const { [column]: _removed, ...values } = change.values;
    return { ...change, values };
  });
}
