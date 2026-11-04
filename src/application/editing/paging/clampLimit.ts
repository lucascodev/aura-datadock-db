const MIN_LIMIT = 1;
const MAX_LIMIT = 5000;

export function clampLimit(limit: number): number | undefined {
  return Number.isSafeInteger(limit) ? Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, limit)) : undefined;
}
