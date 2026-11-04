import type { ViewportTransform } from '../model/ViewportTransform';

export function centerOn(pointX: number, pointY: number, scale: number, viewWidth: number, viewHeight: number): ViewportTransform {
  return { scale, x: viewWidth / 2 - pointX * scale, y: viewHeight / 2 - pointY * scale };
}
