import { HEADER_HEIGHT, ROW_HEIGHT } from '../../constants/diagramMetrics';
import type { DiagramEdge, DiagramPositions, DiagramTable } from '../../model/DiagramModel';
import type { EdgeAnchor } from '../../model/EdgeAnchor';
import { routeBetween } from './routeBetween';
import { routeSelfLoop } from './routeSelfLoop';

export function routeEdge(edge: DiagramEdge, tables: ReadonlyMap<string, DiagramTable>, positions: DiagramPositions): string | undefined {
  const child = resolveAnchor(edge.childTable, edge.childColumn, tables, positions);
  const parent = resolveAnchor(edge.parentTable, edge.parentColumn, tables, positions);
  if (!child || !parent) {
    return undefined;
  }
  return edge.childTable === edge.parentTable ? routeSelfLoop(child, parent) : routeBetween(child, parent);
}

function resolveAnchor(
  tableName: string,
  columnName: string | undefined,
  tables: ReadonlyMap<string, DiagramTable>,
  positions: DiagramPositions,
): EdgeAnchor | undefined {
  const table = tables.get(tableName);
  const origin = positions[tableName];
  if (!table || !origin) {
    return undefined;
  }
  return { table, origin, y: origin.y + rowCenter(table, columnName) };
}

function rowCenter(table: DiagramTable, columnName: string | undefined): number {
  const index = columnName === undefined ? -1 : table.columns.findIndex((column) => column.name === columnName);
  return index === -1 ? HEADER_HEIGHT / 2 : HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
}
