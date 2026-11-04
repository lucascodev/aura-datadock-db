import { createAxisFormatter } from '../../../formatting/createAxisFormatter';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';

export function createValueLabels(context: OptionContext, values: readonly number[]): EChartsOptionRecord {
  return { axisLabel: { color: context.palette.mutedText, hideOverlap: true, formatter: createAxisFormatter(values) } };
}
