import type { ConnectionSourceKind, ConnectionTarget } from '../model/ConnectionTarget';

export interface ConnectionSource {
  readonly kind: ConnectionSourceKind;
  discover(): Promise<ConnectionTarget[]>;
}
