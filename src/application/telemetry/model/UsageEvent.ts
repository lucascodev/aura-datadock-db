import type { ConnectionSourceKind } from '../../../domain/connection/model/ConnectionTarget';
import type { DriverId } from '../../../domain/driver/model/DriverId';

export type UsageEvent =
  | { readonly name: 'activated' }
  | { readonly name: 'command.used'; readonly command: string }
  | {
      readonly name: 'connection.opened';
      readonly driver: DriverId;
      readonly source: ConnectionSourceKind;
      readonly ssh: boolean;
      readonly remote: boolean;
    };
