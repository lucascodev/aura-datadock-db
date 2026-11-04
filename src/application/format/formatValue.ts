export function formatValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return `<binary ${value.length} bytes>`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
