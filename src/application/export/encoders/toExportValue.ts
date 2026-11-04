const HEX_PREFIX = '\\x';

export function toExportValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return `${HEX_PREFIX}${value.toString('hex')}`;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function toExportText(value: unknown): string {
  const exported = toExportValue(value);
  if (exported === null || exported === undefined) {
    return '';
  }
  return typeof exported === 'object' ? JSON.stringify(exported) : String(exported);
}
