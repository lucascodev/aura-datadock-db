export function isSameName(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}
