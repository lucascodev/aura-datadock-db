import type { DatabaseKind } from './DatabaseKind';

export type CredentialSource = 'container-env' | 'secret-storage' | 'missing';

export interface ConnectionTarget {
  readonly id: string;
  readonly containerName: string;
  readonly image: string;
  readonly kind: DatabaseKind;
  readonly host?: string;
  readonly port?: number;
  readonly user: string;
  readonly password?: string;
  readonly database?: string;
  readonly credentialSource: CredentialSource;
}

export function isReachable(target: ConnectionTarget): boolean {
  return target.host !== undefined && target.port !== undefined;
}
