import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';

const ZOOM_FROM_POINTS = 30;

export function createZoomOptions(context: OptionContext, pointCount: number): EChartsOptionRecord[] {
  const { palette, isExport } = context;
  if (isExport || pointCount <= ZOOM_FROM_POINTS) {
    return [];
  }
  return [
    { type: 'inside' },
    { type: 'slider', height: 18, bottom: 8, borderColor: palette.baseline, textStyle: { color: palette.mutedText }, fillerColor: 'rgba(128, 128, 128, 0.15)', dataBackground: { lineStyle: { color: palette.baseline }, areaStyle: { color: palette.grid } } },
  ];
}
