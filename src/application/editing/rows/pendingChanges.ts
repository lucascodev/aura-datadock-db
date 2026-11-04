import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { CellValues, RowChange } from './RowChange';

export function rowKeyId(key: CellValues): string {
  return JSON.stringify(Object.entries(key).sort(([left], [right]) => left.localeCompare(right)));
}

function hasKey(change: RowChange, keyId: string): boolean {
  return change.type !== 'insert' && rowKeyId(change.key) === keyId;
}

export function findUpdate(changes: readonly RowChange[], key: CellValues): Extract<RowChange, { type: 'update' }> | undefined {
  const keyId = rowKeyId(key);
  return changes.find((change): change is Extract<RowChange, { type: 'update' }> => change.type === 'update' && hasKey(change, keyId));
}

export function isMarkedForDeletion(changes: readonly RowChange[], key: CellValues): boolean {
  const keyId = rowKeyId(key);
  return changes.some((change) => change.type === 'delete' && hasKey(change, keyId));
}

export function editCell(changes: readonly RowChange[], key: CellValues, column: string, value: CellValue, original: CellValue): RowChange[] {
  const keyId = rowKeyId(key);
  const others = changes.filter((change) => !(change.type === 'update' && hasKey(change, keyId)));
  const { [column]: _replaced, ...remaining } = findUpdate(changes, key)?.values ?? {};
  const values = value === original ? remaining : { ...remaining, [column]: value };
  return Object.keys(values).length > 0 ? [...others, { type: 'update', key, values }] : others;
}

export function toggleDeletion(changes: readonly RowChange[], key: CellValues): RowChange[] {
  const keyId = rowKeyId(key);
  const others = changes.filter((change) => !hasKey(change, keyId));
  return isMarkedForDeletion(changes, key) ? others : [...others, { type: 'delete', key }];
}

export function addInsert(changes: readonly RowChange[], id: string): RowChange[] {
  return [...changes, { type: 'insert', id, values: {} }];
}

export function editInsert(changes: readonly RowChange[], id: string, column: string, value: CellValue): RowChange[] {
  return changes.map((change) => (change.type === 'insert' && change.id === id ? { ...change, values: { ...change.values, [column]: value } } : change));
}

export function clearInsertValue(changes: readonly RowChange[], id: string, column: string): RowChange[] {
  return changes.map((change) => {
    if (change.type !== 'insert' || change.id !== id) {
      return change;
    }
    const { [column]: _removed, ...values } = change.values;
    return { ...change, values };
  });
}

export function removeInsert(changes: readonly RowChange[], id: string): RowChange[] {
  return changes.filter((change) => !(change.type === 'insert' && change.id === id));
}
