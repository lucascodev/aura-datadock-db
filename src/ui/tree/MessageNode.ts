import * as vscode from 'vscode';

export class MessageNode extends vscode.TreeItem {
  constructor(message: string, icon = 'info', command?: vscode.Command) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'message';
    this.iconPath = new vscode.ThemeIcon(icon);
    this.command = command;
  }
}
