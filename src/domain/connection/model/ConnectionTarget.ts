import type { ConnectionTls } from './ConnectionTls';
import type { DriverId } from '../../driver/model/DriverId';
import type { SshSettings } from './SshSettings';

type CredentialSource = 'container-env' | 'secret-storage' | 'missing';

export type ConnectionSourceKind = 'docker' | 'saved';

export interface ConnectionTarget {
  readonly id: string;
  readonly key: string;
  readonly parentId?: string;
  readonly name: string;
  readonly detail: string;
  readonly source: ConnectionSourceKind;
  readonly kind: DriverId;
  readonly host?: string;
  readonly port?: number;
  readonly user: string;
  readonly password?: string;
  readonly database?: string;
  readonly credentialSource: CredentialSource;
  readonly credentialScope?: string;
  readonly isRemote: boolean;
  readonly isReadOnly: boolean;
  readonly tls: ConnectionTls;
  readonly ssh?: SshSettings;
}
