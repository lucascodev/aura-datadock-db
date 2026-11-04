import type { ConnectionTarget } from '../../../../domain/connection/ConnectionTarget';

export function passwordSecretName(target: Pick<ConnectionTarget, 'id' | 'name' | 'source' | 'credentialScope'>): string {
  return target.source === 'saved' ? savedPasswordSecretName(target.id) : `auraDataDockDb.password.${target.credentialScope}/${target.name}`;
}

export function savedPasswordSecretName(connectionId: string): string {
  return `auraDataDockDb.connection.${connectionId}.password`;
}
