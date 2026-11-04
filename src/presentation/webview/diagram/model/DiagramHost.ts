import type { DiagramWebviewMessage } from '../../../contracts/DiagramMessages';

export interface DiagramHost {
  postMessage(message: DiagramWebviewMessage): void;
}
