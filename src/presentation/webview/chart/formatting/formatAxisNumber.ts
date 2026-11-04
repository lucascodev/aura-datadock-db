import { createAxisFormatter } from './createAxisFormatter';

export function formatAxisNumber(value: number): string {
  return createAxisFormatter([value])(value);
}
