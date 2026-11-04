import type { RowBatch } from '../../../../domain/database/model/RowBatch';
import type { RowEncoder } from '../../model/RowEncoder';

export function encodeRows(encoder: RowEncoder, { columns, rows }: RowBatch): string {
  return [encoder.begin(columns), ...rows.map((row) => encoder.encode(row)), encoder.end()].join('');
}
