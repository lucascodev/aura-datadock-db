import type { ResultsWebviewMessage } from '../../../contracts/ResultsMessages';
import type { ResultsSession } from '../session/ResultsSession';

export interface ResultsContext {
  readonly app: HTMLElement;
  readonly host: { postMessage(message: ResultsWebviewMessage): void };
  readonly session: ResultsSession;
  rerender(): void;
}
