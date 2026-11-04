import type { DiagramEdge, DiagramTable } from '../../model/DiagramModel';

export function assignRanks(tables: readonly DiagramTable[], edges: readonly DiagramEdge[]): ReadonlyMap<string, number> {
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
