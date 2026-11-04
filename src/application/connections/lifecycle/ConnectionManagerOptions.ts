import type { ConnectionTarget } from '../../../domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/DatabaseAdapter';

export interface ConnectionManagerOptions {
  readonly readOnly: (target: ConnectionTarget) => boolean;
  readonly openAdapter: (target: ConnectionTarget) => DatabaseAdapter | Promise<DatabaseAdapter>;
}
