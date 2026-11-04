interface VsCodeApi<Message> {
  postMessage(message: Message): void;
}

declare function acquireVsCodeApi<Message>(): VsCodeApi<Message>;

export function connectToHost<Message>(): VsCodeApi<Message> {
  return acquireVsCodeApi<Message>();
}
