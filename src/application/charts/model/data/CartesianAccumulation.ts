import type { RowTally } from './RowTally';

export interface CartesianAccumulation {
  readonly series: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly labels: ReadonlySet<string>;
  readonly tally: RowTally;
}
