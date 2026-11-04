import { ROW_SPACING } from '../../constants/layoutSpacing';
import type { DiagramTable } from '../../model/DiagramModel';

const MAX_COLUMN_HEIGHT = 1800;

export function splitTallColumns(columns: readonly DiagramTable[][]): DiagramTable[][] {
  return columns.flatMap((column) => {
    const chunks: DiagramTable[][] = [[]];
    let height = 0;
    for (const table of column) {
      if (height + table.height > MAX_COLUMN_HEIGHT && chunks[chunks.length - 1].length > 0) {
        chunks.push([]);
        height = 0;
      }
      chunks[chunks.length - 1].push(table);
      height += table.height + ROW_SPACING;
    }
    return chunks;
  });
}
