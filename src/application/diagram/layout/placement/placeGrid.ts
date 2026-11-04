import { ROW_SPACING } from '../../constants/layoutSpacing';
import type { DiagramPoint, DiagramTable } from '../../model/DiagramModel';

export function placeGrid(tables: readonly DiagramTable[], top: number, maxWidth: number): [string, DiagramPoint][] {
  const placed: [string, DiagramPoint][] = [];
  let x = 0;
  let y = top;
  let rowHeight = 0;

  for (const table of tables) {
    if (x > 0 && x + table.width > maxWidth) {
      x = 0;
      y += rowHeight + ROW_SPACING;
      rowHeight = 0;
    }
    placed.push([table.name, { x, y }]);
    x += table.width + ROW_SPACING;
    rowHeight = Math.max(rowHeight, table.height);
  }
  return placed;
}
