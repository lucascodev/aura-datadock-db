export function lastOffset(total: number | undefined, limit: number): number {
  return total === undefined || total === 0 ? 0 : Math.floor((total - 1) / limit) * limit;
}
