import { toExportValue } from './toExportValue';

export function toExportText(value: unknown): string {
  const exported = toExportValue(value);
  if (exported === null || exported === undefined) {
    return '';
  }
  return typeof exported === 'object' ? JSON.stringify(exported) : String(exported);
}
