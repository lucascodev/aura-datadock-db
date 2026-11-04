import { ROW_SPACING } from '../../constants/layoutSpacing';
import type { DiagramPoint, DiagramTable } from '../../model/DiagramModel';

const COLUMN_SPACING = 90;

export function placeColumns(columns: readonly DiagramTable[][]): [string, DiagramPoint][] {
  const heights = columns.map(columnHeight);
  const tallest = Math.max(0, ...heights);
  const placed: [string, DiagramPoint][] = [];
  let x = 0;

  columns.forEach((column, index) => {
    let y = (tallest - heights[index]) / 2;
    for (const table of column) {
      placed.push([table.name, { x, y: Math.round(y) }]);
      y += table.height + ROW_SPACING;
    }
    x += Math.max(0, ...column.map((table) => table.width)) + COLUMN_SPACING;
  });
  return placed;
}

function columnHeight(column: readonly DiagramTable[]): number {
  const tables = column.reduce((sum, table) => sum + table.height, 0);
  return tables + Math.max(0, column.length - 1) * ROW_SPACING;
}
