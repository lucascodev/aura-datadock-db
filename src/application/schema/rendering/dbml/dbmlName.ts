const SIMPLE_NAME = /^[A-Za-z_]\w*$/;

export function dbmlName(identifier: string): string {
  return SIMPLE_NAME.test(identifier) ? identifier : `"${identifier.replace(/"/g, '\\"')}"`;
}
