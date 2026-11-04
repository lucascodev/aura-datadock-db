import { escapeMarkup } from '../../../format/text/escapeMarkup';
import { CORNER_RADIUS, HEADER_FONT_SIZE, HEADER_HEIGHT, HORIZONTAL_PADDING, TEXT_BASELINE_OFFSET } from '../../constants/diagramMetrics';
import type { DiagramTable } from '../../model/DiagramModel';
import type { DiagramPalette } from '../../model/DiagramPalette';

export function renderHeader(table: DiagramTable, palette: DiagramPalette): string {
  const fill = table.kind === 'view' ? palette.viewHeaderFill : palette.headerFill;
  const radius = CORNER_RADIUS;
  const bottomRadius = table.columns.length === 0 ? radius : 0;
  const shape = [
    `M 0 ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0`,
    `L ${table.width - radius} 0 A ${radius} ${radius} 0 0 1 ${table.width} ${radius}`,
    `L ${table.width} ${HEADER_HEIGHT - bottomRadius}`,
    bottomRadius > 0 ? `A ${radius} ${radius} 0 0 1 ${table.width - radius} ${HEADER_HEIGHT}` : '',
    `L ${bottomRadius} ${HEADER_HEIGHT}`,
    bottomRadius > 0 ? `A ${radius} ${radius} 0 0 1 0 ${HEADER_HEIGHT - radius}` : '',
    'Z',
  ].join(' ');
  const label = table.kind === 'view' ? `${table.name} (view)` : table.name;

  return [
    `<path d="${shape}" fill="${fill}"/>`,
    `<text x="${HORIZONTAL_PADDING}" y="${HEADER_HEIGHT / 2 + TEXT_BASELINE_OFFSET}" font-size="${HEADER_FONT_SIZE}" font-weight="600" fill="${palette.headerText}">${escapeMarkup(label)}</text>`,
  ].join('');
}
