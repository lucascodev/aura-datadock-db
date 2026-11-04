import type { EdgeAnchor } from '../../model/EdgeAnchor';

const MIN_CONTROL_OFFSET = 44;
const SIDE_BY_SIDE_MARGIN = 40;

export function routeBetween(child: EdgeAnchor, parent: EdgeAnchor): string {
  const childLeft = child.origin.x;
  const childRight = child.origin.x + child.table.width;
  const parentLeft = parent.origin.x;
  const parentRight = parent.origin.x + parent.table.width;

  if (childRight + SIDE_BY_SIDE_MARGIN < parentLeft) {
    return curve(childRight, child.y, 1, parentLeft, parent.y, -1);
  }
  if (parentRight + SIDE_BY_SIDE_MARGIN < childLeft) {
    return curve(childLeft, child.y, -1, parentRight, parent.y, 1);
  }
  return curve(childRight, child.y, 1, parentRight, parent.y, 1);
}

function curve(startX: number, startY: number, startDirection: number, endX: number, endY: number, endDirection: number): string {
  const offset = Math.max(MIN_CONTROL_OFFSET, Math.abs(endX - startX) / 2);
  return `M ${startX} ${startY} C ${startX + startDirection * offset} ${startY}, ${endX + endDirection * offset} ${endY}, ${endX} ${endY}`;
}
