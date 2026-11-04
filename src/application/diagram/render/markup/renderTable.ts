import { escapeMarkup } from '../../../format/text/escapeMarkup';
import { CORNER_RADIUS } from '../../constants/diagramMetrics';
import type { DiagramPositions, DiagramTable } from '../../model/DiagramModel';
import type { DiagramPalette } from '../../model/DiagramPalette';
import { renderColumn } from './renderColumn';
import { renderHeader } from './renderHeader';

export function renderTable(table: DiagramTable, positions: DiagramPositions, palette: DiagramPalette): string {
  const position = positions[table.name];
  if (!position) {
    return '';
  }
  const rows = table.columns.map((column, index) => renderColumn(column, index, table, palette)).join('');
  return [
    `<g data-table="${escapeMarkup(table.name)}" transform="translate(${position.x} ${position.y})" font-family="${escapeMarkup(palette.fontFamily)}">`,
    `<rect width="${table.width}" height="${table.height}" rx="${CORNER_RADIUS}" fill="${palette.tableFill}" stroke="${palette.tableBorder}"/>`,
    renderHeader(table, palette),
    rows,
    '</g>',
  ].join('');
}
