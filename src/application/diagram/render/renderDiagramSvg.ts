import { escapeMarkup } from '../../format/text/escapeMarkup';
import {
  BADGE_WIDTH,
  CORNER_RADIUS,
  FONT_SIZE,
  HEADER_FONT_SIZE,
  HEADER_HEIGHT,
  HORIZONTAL_PADDING,
  MAX_LABEL_CHARACTERS,
  MAX_TYPE_CHARACTERS,
  ROW_HEIGHT,
} from '../constants/diagramMetrics';
import type { DiagramColumn, DiagramEdge, DiagramModel, DiagramPositions, DiagramTable } from '../model/DiagramModel';
import type { DiagramPalette } from '../model/DiagramPalette';
import { routeEdge } from '../layout/routeEdge';
import { truncateLabel } from '../layout/truncateLabel';

const EXPORT_MARGIN = 32;
const MARKER_SIZE = 18;
const TEXT_BASELINE_OFFSET = 4;

export function renderDiagramMarkup(model: DiagramModel, positions: DiagramPositions, palette: DiagramPalette): string {
  const tableByName = new Map(model.tables.map((table) => [table.name, table]));
  const edges = model.edges.map((edge) => renderEdge(edge, tableByName, positions, palette)).join('');
  const tables = model.tables.map((table) => renderTable(table, positions, palette)).join('');
  return `${renderMarkers(palette)}<g data-layer="edges">${edges}</g><g data-layer="tables">${tables}</g>`;
}

export function measureExportSize(model: DiagramModel, positions: DiagramPositions): { width: number; height: number } {
  const bounds = measureDiagram(model, positions);
  return { width: bounds.right - bounds.left + EXPORT_MARGIN * 2, height: bounds.bottom - bounds.top + EXPORT_MARGIN * 2 };
}

export function renderDiagramSvg(model: DiagramModel, positions: DiagramPositions, palette: DiagramPalette): string {
  const bounds = measureDiagram(model, positions);
  const { width, height } = measureExportSize(model, positions);
  const viewBox = `${bounds.left - EXPORT_MARGIN} ${bounds.top - EXPORT_MARGIN} ${width} ${height}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">`,
    `<rect x="${bounds.left - EXPORT_MARGIN}" y="${bounds.top - EXPORT_MARGIN}" width="${width}" height="${height}" fill="${palette.background}"/>`,
    renderDiagramMarkup(model, positions, palette),
    '</svg>',
  ].join('');
}

export function measureDiagram(model: DiagramModel, positions: DiagramPositions): { left: number; top: number; right: number; bottom: number } {
  const placed = model.tables.filter((table) => positions[table.name]);
  if (placed.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  return {
    left: Math.min(...placed.map((table) => positions[table.name].x)),
    top: Math.min(...placed.map((table) => positions[table.name].y)),
    right: Math.max(...placed.map((table) => positions[table.name].x + table.width)),
    bottom: Math.max(...placed.map((table) => positions[table.name].y + table.height)),
  };
}

export function edgeMarkerIds(edge: DiagramEdge): { start: string; end: string } {
  return {
    start: edge.cardinality === 'one-to-one' ? 'dd-zero-one' : 'dd-zero-many',
    end: edge.isParentOptional ? 'dd-zero-one' : 'dd-one',
  };
}

function renderMarkers(palette: DiagramPalette): string {
  const stroke = `fill="none" stroke="${palette.edge}" stroke-width="1.4"`;
  const circle = `<circle cx="5" cy="9" r="3" fill="${palette.background}" stroke="${palette.edge}" stroke-width="1.4"/>`;
  const crowFoot = `<path d="M 9 9 L 18 3 M 9 9 L 18 15 M 9 9 L 18 9" ${stroke}/>`;
  const bar = (x: number) => `<path d="M ${x} 3 L ${x} 15" ${stroke}/>`;

  const markers: Readonly<Record<string, string>> = {
    'dd-one': `${bar(9)}${bar(13)}`,
    'dd-zero-one': `${circle}${bar(13)}`,
    'dd-zero-many': `${circle}${crowFoot}`,
  };

  const definitions = Object.entries(markers).map(
    ([id, shape]) =>
      `<marker id="${id}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}" refX="${MARKER_SIZE}" refY="9" markerWidth="${MARKER_SIZE}" markerHeight="${MARKER_SIZE}" markerUnits="userSpaceOnUse" orient="auto-start-reverse">${shape}</marker>`,
  );
  return `<defs>${definitions.join('')}</defs>`;
}

function renderEdge(edge: DiagramEdge, tables: ReadonlyMap<string, DiagramTable>, positions: DiagramPositions, palette: DiagramPalette): string {
  const path = routeEdge(edge, tables, positions);
  if (!path) {
    return '';
  }
  const markers = edgeMarkerIds(edge);
  return [
    `<path data-edge="${escapeMarkup(edge.id)}" d="${path}" fill="none" stroke="${palette.edge}" stroke-width="1.4"`,
    ` marker-start="url(#${markers.start})" marker-end="url(#${markers.end})">`,
    `<title>${escapeMarkup(`${edge.childTable} → ${edge.parentTable} (${edge.name})`)}</title></path>`,
  ].join('');
}

function renderTable(table: DiagramTable, positions: DiagramPositions, palette: DiagramPalette): string {
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

function renderHeader(table: DiagramTable, palette: DiagramPalette): string {
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

function renderColumn(column: DiagramColumn, index: number, table: DiagramTable, palette: DiagramPalette): string {
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
