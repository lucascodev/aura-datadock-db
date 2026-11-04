import type { RowTally } from '../../model/data/RowTally';

export function createTally(): RowTally {
  return { unusable: 0, merged: 0, folded: 0, isApproximate: false };
}
