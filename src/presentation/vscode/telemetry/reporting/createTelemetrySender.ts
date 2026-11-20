import type * as vscode from 'vscode';
import type { UsageSink } from '../../../../application/telemetry/ports/UsageSink';

function withoutExtensionPrefix(eventName: string): string {
  return eventName.slice(eventName.lastIndexOf('/') + 1);
}

export function createTelemetrySender(sink: UsageSink): vscode.TelemetrySender {
  return {
    sendEventData: (eventName, data) => sink.send(withoutExtensionPrefix(eventName), data ?? {}),
    sendErrorData: (error) => sink.send('error', { kind: error.name }),
  };
}
