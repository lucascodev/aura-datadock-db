import type * as vscode from 'vscode';

export interface HostEnvironment {
  readonly extension: vscode.ExtensionContext;
  readonly output: vscode.LogOutputChannel;
  config(): vscode.WorkspaceConfiguration;
}
