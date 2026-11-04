const ELLIPSIS = '…';

export function truncateLabel(text: string, maxCharacters: number): string {
  return text.length > maxCharacters ? `${text.slice(0, maxCharacters - 1)}${ELLIPSIS}` : text;
}
