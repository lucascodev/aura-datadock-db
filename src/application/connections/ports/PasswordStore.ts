import type { ConnectionTarget } from '../../../domain/connection/ConnectionTarget';

export interface PasswordStore {
  get(target: ConnectionTarget): PromiseLike<string | undefined>;
}
