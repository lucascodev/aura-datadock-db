import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { savedPasswordSecretName } from './savedPasswordSecretName';

export function passwordSecretName(target: Pick<ConnectionTarget, 'id' | 'name' | 'source' | 'credentialScope'>): string {
  return target.source === 'saved' ? savedPasswordSecretName(target.id) : `auraDataDockDb.password.${target.credentialScope}/${target.name}`;
}
