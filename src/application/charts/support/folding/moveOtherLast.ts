import { otherLabel } from './otherLabel';

export function moveOtherLast(names: readonly string[]): string[] {
  return [...names.filter((name) => name !== otherLabel()), ...names.filter((name) => name === otherLabel())];
}
