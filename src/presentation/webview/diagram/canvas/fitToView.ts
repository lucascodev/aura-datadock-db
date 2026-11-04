import type { ViewportTransform } from '../model/ViewportTransform';
import { clampScale } from './clampScale';

interface ContentBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const FIT_MARGIN = 32;

const MAX_FIT_SCALE = 1;

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
