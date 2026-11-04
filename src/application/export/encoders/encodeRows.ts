import type { RowBatch } from '../../../domain/database/RowBatch';
import type { RowEncoder } from './RowEncoder';

export function encodeRows(encoder: RowEncoder, { columns, rows }: RowBatch): string {
  return [encoder.begin(columns), ...rows.map((row) => encoder.encode(row)), encoder.end()].join('');
}

export interface WriteRowBatchesOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (rowCount: number) => void;
}

export interface WriteRowBatchesResult {
  readonly rowCount: number;
  readonly isComplete: boolean;
}

export async function writeRowBatches(
  batches: AsyncIterable<RowBatch>,
  encoder: RowEncoder,
  write: (chunk: string) => Promise<void>,
  options: WriteRowBatchesOptions = {},
): Promise<WriteRowBatchesResult> {
  let rowCount = 0;
  let hasBegun = false;

  for await (const batch of batches) {
    if (options.signal?.aborted) {
      return { rowCount, isComplete: false };
    }
    const header = hasBegun ? '' : encoder.begin(batch.columns);
    hasBegun = true;
    await write(header + batch.rows.map((row) => encoder.encode(row)).join(''));
    rowCount += batch.rows.length;
    options.onProgress?.(rowCount);
  }

  if (hasBegun) {
    await write(encoder.end());
  }
  return { rowCount, isComplete: true };
}
