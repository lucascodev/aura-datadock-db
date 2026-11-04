export function parseEnv(entries: readonly string[] = []): Record<string, string> {
  const env: Record<string, string> = {};
  for (const entry of entries) {
    const index = entry.indexOf('=');
    if (index > 0) {
      env[entry.slice(0, index)] = entry.slice(index + 1);
    }
  }
  return env;
}
