import type { DiagramEdge, DiagramModel, DiagramPoint, DiagramPositions, DiagramTable } from '../model/DiagramModel';

const COLUMN_SPACING = 90;
const ROW_SPACING = 36;
const MAX_COLUMN_HEIGHT = 1800;
const MIN_GRID_WIDTH = 1100;
const ISOLATED_SECTION_GAP = 80;
const ORDERING_SWEEPS = 4;

export function layoutDiagram(model: DiagramModel): DiagramPositions {
  const connectedNames = collectConnectedNames(model.edges);
  const connected = model.tables.filter((table) => connectedNames.has(table.name));
  const isolated = model.tables.filter((table) => !connectedNames.has(table.name));

  const ranks = assignRanks(connected, model.edges);
  const columns = splitTallColumns(orderColumns(groupByRank(connected, ranks), model.edges));
  const placed = placeColumns(columns);
  const bounds = measure(placed, connected);
  const top = connected.length > 0 ? bounds.bottom + ISOLATED_SECTION_GAP : 0;
  const grid = placeGrid(isolated, top, Math.max(MIN_GRID_WIDTH, bounds.right));

  return Object.fromEntries([...placed, ...grid]);
}

function collectConnectedNames(edges: readonly DiagramEdge[]): ReadonlySet<string> {
  return new Set(edges.filter((edge) => edge.childTable !== edge.parentTable).flatMap((edge) => [edge.childTable, edge.parentTable]));
}

function assignRanks(tables: readonly DiagramTable[], edges: readonly DiagramEdge[]): ReadonlyMap<string, number> {
  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.childTable !== edge.parentTable) {
      parentsByChild.set(edge.childTable, [...(parentsByChild.get(edge.childTable) ?? []), edge.parentTable]);
      childrenByParent.set(edge.parentTable, [...(childrenByParent.get(edge.parentTable) ?? []), edge.childTable]);
    }
  }

  const ranks = assignLongestPathRanks(tables, parentsByChild);
  return pullParentsTowardChildren(ranks, childrenByParent);
}

function pullParentsTowardChildren(
  ranks: ReadonlyMap<string, number>,
  childrenByParent: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, number> {
  const pulled = new Map(ranks);
  const fromDeepestToShallowest = [...ranks.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

  for (const name of fromDeepestToShallowest) {
    const rank = pulled.get(name) ?? 0;
    const childRanks = (childrenByParent.get(name) ?? []).map((child) => pulled.get(child) ?? 0).filter((childRank) => childRank > rank);
    if (childRanks.length > 0 && childRanks.length === (childrenByParent.get(name) ?? []).length) {
      pulled.set(name, Math.min(...childRanks) - 1);
    }
  }
  return pulled;
}

function assignLongestPathRanks(tables: readonly DiagramTable[], parentsByChild: ReadonlyMap<string, readonly string[]>): ReadonlyMap<string, number> {
  const ranks = new Map<string, number>();
  const visiting = new Set<string>();

  const rankOf = (name: string): number => {
    const known = ranks.get(name);
    if (known !== undefined) {
      return known;
    }
    visiting.add(name);
    const parents = (parentsByChild.get(name) ?? []).filter((parent) => !visiting.has(parent));
    const rank = parents.length === 0 ? 0 : 1 + Math.max(...parents.map(rankOf));
    visiting.delete(name);
    ranks.set(name, rank);
    return rank;
  };

  tables.forEach((table) => rankOf(table.name));
  return ranks;
}

function groupByRank(tables: readonly DiagramTable[], ranks: ReadonlyMap<string, number>): DiagramTable[][] {
  const columns: DiagramTable[][] = [];
  for (const table of tables) {
    const rank = ranks.get(table.name) ?? 0;
    columns[rank] = [...(columns[rank] ?? []), table];
  }
  return columns.map((column) => column ?? []);
}

function orderColumns(columns: readonly DiagramTable[][], edges: readonly DiagramEdge[]): DiagramTable[][] {
  const neighbors = buildNeighbors(edges);
  let ordered = columns.map((column) => [...column]);

  for (let sweep = 0; sweep < ORDERING_SWEEPS; sweep++) {
    const isForward = sweep % 2 === 0;
    const indexes = ordered.map((_, index) => index);
    for (const columnIndex of isForward ? indexes.slice(1) : indexes.slice(0, -1).reverse()) {
      const reference = ordered[columnIndex + (isForward ? -1 : 1)];
      ordered = ordered.map((column, index) => (index === columnIndex ? sortByBarycenter(column, reference, neighbors) : column));
    }
  }
  return ordered;
}

function buildNeighbors(edges: readonly DiagramEdge[]): ReadonlyMap<string, readonly string[]> {
  const neighbors = new Map<string, string[]>();
  const link = (from: string, to: string) => neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
  for (const edge of edges) {
    link(edge.childTable, edge.parentTable);
    link(edge.parentTable, edge.childTable);
  }
  return neighbors;
}

function sortByBarycenter(
  column: readonly DiagramTable[],
  reference: readonly DiagramTable[],
  neighbors: ReadonlyMap<string, readonly string[]>,
): DiagramTable[] {
  const positionByName = new Map(reference.map((table, index) => [table.name, index]));

  const scored = column.map((table, index) => {
    const positions = (neighbors.get(table.name) ?? []).flatMap((name) => {
      const position = positionByName.get(name);
      return position === undefined ? [] : [position];
    });
    const score = positions.length > 0 ? positions.reduce((sum, position) => sum + position, 0) / positions.length : index;
    return { table, score, index };
  });

  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((entry) => entry.table);
}

function splitTallColumns(columns: readonly DiagramTable[][]): DiagramTable[][] {
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

function placeColumns(columns: readonly DiagramTable[][]): [string, DiagramPoint][] {
  const heights = columns.map(columnHeight);
  const tallest = Math.max(0, ...heights);
  const placed: [string, DiagramPoint][] = [];
  let x = 0;

  columns.forEach((column, index) => {
    let y = (tallest - heights[index]) / 2;
    for (const table of column) {
      placed.push([table.name, { x, y: Math.round(y) }]);
      y += table.height + ROW_SPACING;
    }
    x += Math.max(0, ...column.map((table) => table.width)) + COLUMN_SPACING;
  });
  return placed;
}

function columnHeight(column: readonly DiagramTable[]): number {
  const tables = column.reduce((sum, table) => sum + table.height, 0);
  return tables + Math.max(0, column.length - 1) * ROW_SPACING;
}

function measure(placed: readonly [string, DiagramPoint][], tables: readonly DiagramTable[]): { right: number; bottom: number } {
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

function placeGrid(tables: readonly DiagramTable[], top: number, maxWidth: number): [string, DiagramPoint][] {
  const placed: [string, DiagramPoint][] = [];
  let x = 0;
  let y = top;
  let rowHeight = 0;

  for (const table of tables) {
    if (x > 0 && x + table.width > maxWidth) {
      x = 0;
      y += rowHeight + ROW_SPACING;
      rowHeight = 0;
    }
    placed.push([table.name, { x, y }]);
    x += table.width + ROW_SPACING;
    rowHeight = Math.max(rowHeight, table.height);
  }
  return placed;
}
