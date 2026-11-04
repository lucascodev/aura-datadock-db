import type { ConnectionFormWebviewMessage } from '../../../contracts/ConnectionFormMessages';

export interface ConnectionHost {
  postMessage(message: ConnectionFormWebviewMessage): void;
}
