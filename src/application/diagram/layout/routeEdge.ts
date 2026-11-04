import { HEADER_HEIGHT, ROW_HEIGHT } from '../constants/diagramMetrics';
import type { DiagramEdge, DiagramPoint, DiagramPositions, DiagramTable } from '../model/DiagramModel';

const MIN_CONTROL_OFFSET = 44;
const SIDE_BY_SIDE_MARGIN = 40;
const SELF_LOOP_OFFSET = 56;
const SAME_ROW_LOOP_SPREAD = 7;

interface EdgeAnchor {
  readonly table: DiagramTable;
  readonly origin: DiagramPoint;
  readonly y: number;
}

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

function routeBetween(child: EdgeAnchor, parent: EdgeAnchor): string {
  const childLeft = child.origin.x;
  const childRight = child.origin.x + child.table.width;
  const parentLeft = parent.origin.x;
  const parentRight = parent.origin.x + parent.table.width;

  if (childRight + SIDE_BY_SIDE_MARGIN < parentLeft) {
    return curve(childRight, child.y, 1, parentLeft, parent.y, -1);
  }
  if (parentRight + SIDE_BY_SIDE_MARGIN < childLeft) {
    return curve(childLeft, child.y, -1, parentRight, parent.y, 1);
  }
  return curve(childRight, child.y, 1, parentRight, parent.y, 1);
}

function routeSelfLoop(child: EdgeAnchor, parent: EdgeAnchor): string {
  const right = child.origin.x + child.table.width;
  const controlX = right + SELF_LOOP_OFFSET;
  const spread = parent.y === child.y ? SAME_ROW_LOOP_SPREAD : 0;
  const childY = child.y - spread;
  const parentY = parent.y + spread;
  return `M ${right} ${childY} C ${controlX} ${childY}, ${controlX} ${parentY}, ${right} ${parentY}`;
}

function curve(startX: number, startY: number, startDirection: number, endX: number, endY: number, endDirection: number): string {
  const offset = Math.max(MIN_CONTROL_OFFSET, Math.abs(endX - startX) / 2);
  return `M ${startX} ${startY} C ${startX + startDirection * offset} ${startY}, ${endX + endDirection * offset} ${endY}, ${endX} ${endY}`;
}
