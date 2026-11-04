import { otherLabel } from './otherLabel';

interface FoldResult {
  readonly foldedCount: number;
  resolve(name: string): string;
}

export function foldByWeight(weights: ReadonlyMap<string, number>, limit: number, kept = limit - 1): FoldResult {
  if (weights.size <= limit) {
    return { foldedCount: 0, resolve: (name) => name };
  }
  const heaviest = [...weights.entries()].sort(([, left], [, right]) => right - left).slice(0, kept);
  const keptNames = new Set(heaviest.map(([name]) => name));
  return {
    foldedCount: weights.size - kept,
    resolve: (name) => (keptNames.has(name) ? name : otherLabel()),
  };
}
