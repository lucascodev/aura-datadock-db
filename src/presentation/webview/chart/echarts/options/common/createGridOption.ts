import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import { DEFAULT_LEFT_MARGIN } from '../constants/seriesSizes';

export function createGridOption(hasLegend: boolean, hasZoom: boolean): EChartsOptionRecord {
  return { left: DEFAULT_LEFT_MARGIN, right: 24, top: hasLegend ? 36 : 16, bottom: hasZoom ? 56 : 24, containLabel: true };
}
