import type * as vscode from 'vscode';
import type { ConnectionManager } from '../core/ConnectionManager';

export interface DataDockContext {
  readonly connections: ConnectionManager;
  readonly secrets: vscode.SecretStorage;
  readonly output: vscode.LogOutputChannel;
  refresh(): Promise<void>;
  config(): vscode.WorkspaceConfiguration;
}

export function passwordSecretName(containerName: string): string {
  return `auraDataDock.password.${containerName}`;
}
