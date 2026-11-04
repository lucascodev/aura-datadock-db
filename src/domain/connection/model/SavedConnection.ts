import type { TlsMode } from './ConnectionTls';
import type { DriverId } from '../../driver/model/DriverId';
import type { SshSettings } from './SshSettings';

export interface SavedConnection {
  readonly id: string;
  readonly name: string;
  readonly kind: DriverId;
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly database?: string;
  readonly tlsMode: TlsMode;
  readonly caFile?: string;
  readonly isReadOnly: boolean;
  readonly ssh?: SshSettings;
}
