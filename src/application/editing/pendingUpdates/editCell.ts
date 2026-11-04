import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { CellValues, RowChange } from '../model/RowChange';
import { rowKeyId } from './rowKeyId';
import { findUpdate } from './findUpdate';
import { hasKey } from './hasKey';

export function editCell(changes: readonly RowChange[], key: CellValues, column: string, value: CellValue, original: CellValue): RowChange[] {
  const keyId = rowKeyId(key);
  const others = changes.filter((change) => !(change.type === 'update' && hasKey(change, keyId)));
  const { [column]: _replaced, ...remaining } = findUpdate(changes, key)?.values ?? {};
  const values = value === original ? remaining : { ...remaining, [column]: value };
  return Object.keys(values).length > 0 ? [...others, { type: 'update', key, values }] : others;
}
