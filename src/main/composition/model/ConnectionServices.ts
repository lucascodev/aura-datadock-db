import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';
import type { SavedConnections } from '../../../application/connections/saved/SavedConnections';

export interface ConnectionServices {
  readonly savedConnections: SavedConnections;
  readonly manager: ConnectionManager;
}
