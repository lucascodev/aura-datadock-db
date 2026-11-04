import type { CellValue } from '../../../domain/database/model/ParameterizedStatement';
import type { RowChange } from '../model/RowChange';

export function editInsert(changes: readonly RowChange[], id: string, column: string, value: CellValue): RowChange[] {
  return changes.map((change) => (change.type === 'insert' && change.id === id ? { ...change, values: { ...change.values, [column]: value } } : change));
}
