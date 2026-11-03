import * as vscode from 'vscode';

export class NamespaceNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly namespace: string,
  ) {
    super(namespace, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `namespace:${targetId}:${namespace}`;
    this.contextValue = 'namespace';
    this.iconPath = new vscode.ThemeIcon('symbol-namespace');
  }
}
