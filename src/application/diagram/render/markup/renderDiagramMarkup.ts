import { escapeMarkup } from '../../../format/text/escapeMarkup';
import type { DiagramEdge, DiagramModel, DiagramPositions, DiagramTable } from '../../model/DiagramModel';
import type { DiagramPalette } from '../../model/DiagramPalette';
import { routeEdge } from '../../layout/routing/routeEdge';
import { edgeMarkerIds } from './edgeMarkerIds';
import { renderMarkers } from './renderMarkers';
import { renderTable } from './renderTable';

export function renderDiagramMarkup(model: DiagramModel, positions: DiagramPositions, palette: DiagramPalette): string {
  const tableByName = new Map(model.tables.map((table) => [table.name, table]));
  const edges = model.edges.map((edge) => renderEdge(edge, tableByName, positions, palette)).join('');
  const tables = model.tables.map((table) => renderTable(table, positions, palette)).join('');
  return `${renderMarkers(palette)}<g data-layer="edges">${edges}</g><g data-layer="tables">${tables}</g>`;
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
