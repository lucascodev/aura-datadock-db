import * as vscode from 'vscode';

export function registerCommand<Args extends unknown[]>(id: string, handler: (...args: Args) => unknown): vscode.Disposable {
  return vscode.commands.registerCommand(`auraDataDockDb.${id}`, handler);
}
