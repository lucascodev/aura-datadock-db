import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { RING_WIDTH } from '../constants/seriesSizes';

export function createRingStyle(context: OptionContext): EChartsOptionRecord {
  return { borderColor: context.palette.surface, borderWidth: RING_WIDTH };
}
