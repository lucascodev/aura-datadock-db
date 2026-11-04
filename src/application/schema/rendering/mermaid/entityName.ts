export function entityName(name: string): string {
  return /^\w+$/.test(name) ? name : `"${name.replace(/"/g, "'")}"`;
}
