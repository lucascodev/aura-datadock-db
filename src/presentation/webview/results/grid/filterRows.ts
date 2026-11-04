import type { ResultRow } from '../model/ResultRow';

export function filterRows(rows: readonly ResultRow[], filter: string): ResultRow[] {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return [...rows];
  }
  return rows.filter((row) => row.some((cell) => cell?.toLowerCase().includes(needle)));
}
