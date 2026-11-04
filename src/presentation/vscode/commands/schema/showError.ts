import * as vscode from 'vscode';

export function showError(error: unknown): void {
  vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
}
