import type { DiagramTable } from '../../model/DiagramModel';

export function groupByRank(tables: readonly DiagramTable[], ranks: ReadonlyMap<string, number>): DiagramTable[][] {
  const columns: DiagramTable[][] = [];
  for (const table of tables) {
    const rank = ranks.get(table.name) ?? 0;
    columns[rank] = [...(columns[rank] ?? []), table];
  }
  return columns.map((column) => column ?? []);
}
