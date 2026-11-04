import type { TlsMode } from '../../../domain/connection/model/ConnectionTls';
import type { DriverId } from '../../../domain/driver/model/DriverId';

export interface ConnectionInput {
  readonly name: string;
  readonly kind: DriverId;
  readonly host: string;
  readonly port: string;
  readonly user: string;
  readonly database: string;
  readonly tlsMode: TlsMode;
  readonly caFile: string;
  readonly isReadOnly: boolean;
  readonly usesSsh: boolean;
  readonly sshHost: string;
  readonly sshPort: string;
  readonly sshUser: string;
  readonly sshIdentityFile: string;
  readonly sshJumpHost: string;
}
