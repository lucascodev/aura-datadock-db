import { escapeMarkup } from '../../../format/text/escapeMarkup';
import {
  BADGE_WIDTH,
  FONT_SIZE,
  HEADER_HEIGHT,
  HORIZONTAL_PADDING,
  MAX_LABEL_CHARACTERS,
  MAX_TYPE_CHARACTERS,
  ROW_HEIGHT,
  TEXT_BASELINE_OFFSET,
} from '../../constants/diagramMetrics';
import type { DiagramColumn, DiagramTable } from '../../model/DiagramModel';
import type { DiagramPalette } from '../../model/DiagramPalette';
import { truncateLabel } from './truncateLabel';

export function renderColumn(column: DiagramColumn, index: number, table: DiagramTable, palette: DiagramPalette): string {
  const y = HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2 + TEXT_BASELINE_OFFSET;
  const tooltip = describeColumn(column);
  const nameX = HORIZONTAL_PADDING + BADGE_WIDTH;
  const typeX = table.width - HORIZONTAL_PADDING;

  return [
    `<g data-column="${escapeMarkup(column.name)}" font-size="${FONT_SIZE}">`,
    `<title>${escapeMarkup(tooltip)}</title>`,
    renderBadge(column, y, palette),
    `<text x="${nameX}" y="${y}" fill="${palette.text}" font-weight="${column.isPrimaryKey ? 600 : 400}">${escapeMarkup(truncateLabel(column.name, MAX_LABEL_CHARACTERS))}</text>`,
    `<text x="${typeX}" y="${y}" fill="${palette.mutedText}" text-anchor="end">${escapeMarkup(truncateLabel(column.dataType, MAX_TYPE_CHARACTERS))}</text>`,
    '</g>',
  ].join('');
}

function renderBadge(column: DiagramColumn, y: number, palette: DiagramPalette): string {
  if (column.isPrimaryKey) {
    return `<text x="${HORIZONTAL_PADDING}" y="${y}" font-size="10" font-weight="700" fill="${palette.primaryKey}">PK</text>`;
  }
  if (column.isForeignKey) {
    return `<text x="${HORIZONTAL_PADDING}" y="${y}" font-size="10" font-weight="700" fill="${palette.foreignKey}">FK</text>`;
  }
  return '';
}

function describeColumn(column: DiagramColumn): string {
  const nullability = column.isNullable ? 'nullable' : 'not null';
  const target = column.foreignTarget ? ` → ${column.foreignTarget}` : '';
  return `${column.name}: ${column.dataType}, ${nullability}${target}`;
}
