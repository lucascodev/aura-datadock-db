import type { SavedConnection } from '../../../domain/connection/SavedConnection';

export interface SavedConnectionStore {
  read(): readonly unknown[];
  write(connections: readonly SavedConnection[]): PromiseLike<void>;
}
