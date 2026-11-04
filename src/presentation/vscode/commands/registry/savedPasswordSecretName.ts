export function savedPasswordSecretName(connectionId: string): string {
  return `auraDataDockDb.connection.${connectionId}.password`;
}
