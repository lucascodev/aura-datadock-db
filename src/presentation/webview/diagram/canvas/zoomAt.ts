import type { ViewportTransform } from '../model/ViewportTransform';
import { clampScale } from './clampScale';

export function zoomAt(transform: ViewportTransform, factor: number, pointX: number, pointY: number): ViewportTransform {
  const scale = clampScale(transform.scale * factor);
  const ratio = scale / transform.scale;
  return { scale, x: pointX - (pointX - transform.x) * ratio, y: pointY - (pointY - transform.y) * ratio };
}
