import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';

export interface PasswordStore {
  get(target: ConnectionTarget): PromiseLike<string | undefined>;
}
