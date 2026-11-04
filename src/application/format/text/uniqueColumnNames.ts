export function uniqueColumnNames(columns: readonly string[]): string[] {
  const taken = new Set(columns);
  const seen = new Set<string>();

  return columns.map((column) => {
    if (!seen.has(column)) {
      seen.add(column);
      return column;
    }
    let suffix = 2;
    while (taken.has(`${column}_${suffix}`)) {
      suffix++;
    }
    const unique = `${column}_${suffix}`;
    taken.add(unique);
    return unique;
  });
}
