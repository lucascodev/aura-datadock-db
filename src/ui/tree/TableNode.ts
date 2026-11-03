import * as vscode from 'vscode';
import type { TableRef } from '../../domain/TableRef';

export class TableNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly table: TableRef,
  ) {
    super(table.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `table:${targetId}:${table.namespace}.${table.name}`;
    this.contextValue = 'table';
    this.iconPath = new vscode.ThemeIcon('table');
  }
}
