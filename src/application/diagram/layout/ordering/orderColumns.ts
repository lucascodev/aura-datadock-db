import type { DiagramEdge, DiagramTable } from '../../model/DiagramModel';

const ORDERING_SWEEPS = 4;

export function orderColumns(columns: readonly DiagramTable[][], edges: readonly DiagramEdge[]): DiagramTable[][] {
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
