import type { RowBatch } from '../../../../domain/database/model/RowBatch';
import type { RowEncoder } from '../../model/RowEncoder';
import type { WriteRowBatchesResult } from '../../model/WriteRowBatchesResult';

interface WriteRowBatchesOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (rowCount: number) => void;
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
