import type { TableEditorWebviewMessage } from '../../../contracts/TableEditorMessages';

export interface HostPort {
  postMessage(message: TableEditorWebviewMessage): void;
}
