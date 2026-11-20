import * as vscode from 'vscode';
import type { UsageReporter } from '../../../../application/telemetry/ports/UsageReporter';

export function registerCommand<Args extends unknown[]>(usage: UsageReporter, id: string, handler: (...args: Args) => unknown): vscode.Disposable {
  return vscode.commands.registerCommand(`auraDataDockDb.${id}`, (...args: Args) => {
    usage.report({ name: 'command.used', command: id });
    return handler(...args);
  });
}
