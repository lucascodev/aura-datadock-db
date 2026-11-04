import type { TemplatePart } from '../model/TemplatePart';

export function joinParts(parts: readonly (readonly TemplatePart[])[], separator: string): TemplatePart[] {
  return parts.flatMap((part, index) => (index === 0 ? [...part] : [separator, ...part]));
}
