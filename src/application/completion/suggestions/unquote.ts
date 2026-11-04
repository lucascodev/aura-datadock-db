export function unquote(identifier: string): string {
  const first = identifier[0];
  return first === '"' || first === '`' ? identifier.slice(1, -1) : identifier;
}
