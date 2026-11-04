import type { TlsMode } from '../../../domain/connection/ConnectionTls';
import { isLocalHost } from './isLocalHost';

interface SuggestedProtection {
  readonly tlsMode: TlsMode;
  readonly isReadOnly: boolean;
}

export function suggestProtection(host: string, usesSsh: boolean): SuggestedProtection {
  if (usesSsh) {
    return { tlsMode: 'off', isReadOnly: true };
  }
  const isUndecided = host.trim().length === 0;
  return isUndecided || isLocalHost(host) ? { tlsMode: 'off', isReadOnly: false } : { tlsMode: 'verified', isReadOnly: true };
}
