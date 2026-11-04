import {
  BADGE_WIDTH,
  CHARACTER_WIDTH,
  COLUMN_GAP,
  HORIZONTAL_PADDING,
  MAX_LABEL_CHARACTERS,
  MAX_TABLE_WIDTH,
  MAX_TYPE_CHARACTERS,
  MIN_TABLE_WIDTH,
} from '../constants/diagramMetrics';
import type { DiagramColumn } from '../model/DiagramModel';

export function computeTableWidth(tableName: string, columns: readonly DiagramColumn[]): number {
  const headerWidth = tableName.length * CHARACTER_WIDTH + HORIZONTAL_PADDING * 2;
  const rowWidths = columns.map((column) => {
    const labelWidth = Math.min(column.name.length, MAX_LABEL_CHARACTERS) * CHARACTER_WIDTH;
    const typeWidth = Math.min(column.dataType.length, MAX_TYPE_CHARACTERS) * CHARACTER_WIDTH;
    return HORIZONTAL_PADDING * 2 + BADGE_WIDTH + labelWidth + COLUMN_GAP + typeWidth;
  });
  return Math.ceil(Math.min(MAX_TABLE_WIDTH, Math.max(MIN_TABLE_WIDTH, headerWidth, ...rowWidths)));
}
