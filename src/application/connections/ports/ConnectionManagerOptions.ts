import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';

export interface ConnectionManagerOptions {
  readonly readOnly: (target: ConnectionTarget) => boolean;
  readonly openAdapter: (target: ConnectionTarget) => DatabaseAdapter | Promise<DatabaseAdapter>;
}
