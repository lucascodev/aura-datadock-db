import type { ConnectionSourceKind, ConnectionTarget } from './ConnectionTarget';

export interface ConnectionSource {
  readonly kind: ConnectionSourceKind;
  discover(): Promise<ConnectionTarget[]>;
}
