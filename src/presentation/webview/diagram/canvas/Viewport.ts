import type { ViewportTransform } from './ViewportTransform';


interface ContentBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const FIT_MARGIN = 32;
const MAX_FIT_SCALE = 1;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function zoomAt(transform: ViewportTransform, factor: number, pointX: number, pointY: number): ViewportTransform {
  const scale = clampScale(transform.scale * factor);
  const ratio = scale / transform.scale;
  return { scale, x: pointX - (pointX - transform.x) * ratio, y: pointY - (pointY - transform.y) * ratio };
}

export function fitToView(bounds: ContentBounds, viewWidth: number, viewHeight: number): ViewportTransform {
  const contentWidth = Math.max(1, bounds.right - bounds.left);
  const contentHeight = Math.max(1, bounds.bottom - bounds.top);
  const scale = clampScale(
    Math.min(MAX_FIT_SCALE, (viewWidth - FIT_MARGIN * 2) / contentWidth, (viewHeight - FIT_MARGIN * 2) / contentHeight),
  );
  return {
    scale,
    x: (viewWidth - contentWidth * scale) / 2 - bounds.left * scale,
    y: (viewHeight - contentHeight * scale) / 2 - bounds.top * scale,
  };
}

export function centerOn(pointX: number, pointY: number, scale: number, viewWidth: number, viewHeight: number): ViewportTransform {
  return { scale, x: viewWidth / 2 - pointX * scale, y: viewHeight / 2 - pointY * scale };
}
