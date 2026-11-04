import type { DiagramEdge, DiagramModel, DiagramPoint, DiagramPositions, DiagramTable } from '../../model/DiagramModel';
import { orderColumns } from '../ordering/orderColumns';
import { splitTallColumns } from '../ordering/splitTallColumns';
import { assignRanks } from '../ranking/assignRanks';
import { groupByRank } from '../ranking/groupByRank';
import { placeColumns } from './placeColumns';
import { placeGrid } from './placeGrid';

const MIN_GRID_WIDTH = 1100;
const ISOLATED_SECTION_GAP = 80;

export function layoutDiagram(model: DiagramModel): DiagramPositions {
  const connectedNames = collectConnectedNames(model.edges);
  const connected = model.tables.filter((table) => connectedNames.has(table.name));
  const isolated = model.tables.filter((table) => !connectedNames.has(table.name));

  const ranks = assignRanks(connected, model.edges);
  const columns = splitTallColumns(orderColumns(groupByRank(connected, ranks), model.edges));
  const placed = placeColumns(columns);
  const bounds = measurePlacedBounds(placed, connected);
  const top = connected.length > 0 ? bounds.bottom + ISOLATED_SECTION_GAP : 0;
  const grid = placeGrid(isolated, top, Math.max(MIN_GRID_WIDTH, bounds.right));

  return Object.fromEntries([...placed, ...grid]);
}

function collectConnectedNames(edges: readonly DiagramEdge[]): ReadonlySet<string> {
  return new Set(edges.filter((edge) => edge.childTable !== edge.parentTable).flatMap((edge) => [edge.childTable, edge.parentTable]));
}

function measurePlacedBounds(placed: readonly [string, DiagramPoint][], tables: readonly DiagramTable[]): { right: number; bottom: number } {
  const tableByName = new Map(tables.map((table) => [table.name, table]));
  let right = 0;
  let bottom = 0;
  for (const [name, point] of placed) {
    const table = tableByName.get(name);
    right = Math.max(right, point.x + (table?.width ?? 0));
    bottom = Math.max(bottom, point.y + (table?.height ?? 0));
  }
  return { right, bottom };
}
