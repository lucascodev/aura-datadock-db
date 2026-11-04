import type { ChartInput } from '../../model/config/ChartInput';

export function columnIndex(input: ChartInput, name: string | undefined): number {
  return name === undefined ? -1 : input.columns.indexOf(name);
}
