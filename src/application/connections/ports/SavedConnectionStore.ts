import type { SavedConnection } from '../../../domain/connection/model/SavedConnection';

export interface SavedConnectionStore {
  read(): readonly unknown[];
  write(connections: readonly SavedConnection[]): PromiseLike<void>;
}
