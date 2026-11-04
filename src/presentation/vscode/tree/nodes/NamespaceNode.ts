import * as vscode from 'vscode';

export class NamespaceNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly namespace: string,
    isExpanded = false,
  ) {
    super(namespace, isExpanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `namespace:${targetId}:${namespace}`;
    this.contextValue = 'namespace';
    this.iconPath = new vscode.ThemeIcon('symbol-namespace');
  }
}
