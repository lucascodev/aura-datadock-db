import { fullFormat } from './fullFormat';

export function formatFullNumber(value: number): string {
  return fullFormat().format(value);
}
