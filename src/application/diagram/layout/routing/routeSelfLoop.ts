import type { EdgeAnchor } from '../../model/EdgeAnchor';

const SELF_LOOP_OFFSET = 56;
const SAME_ROW_LOOP_SPREAD = 7;

export function routeSelfLoop(child: EdgeAnchor, parent: EdgeAnchor): string {
  const right = child.origin.x + child.table.width;
  const controlX = right + SELF_LOOP_OFFSET;
  const spread = parent.y === child.y ? SAME_ROW_LOOP_SPREAD : 0;
  const childY = child.y - spread;
  const parentY = parent.y + spread;
  return `M ${right} ${childY} C ${controlX} ${childY}, ${controlX} ${parentY}, ${right} ${parentY}`;
}
