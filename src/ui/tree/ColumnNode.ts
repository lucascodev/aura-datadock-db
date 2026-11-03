import * as vscode from 'vscode';
import type { TableColumn } from '../../domain/TableColumn';

export class ColumnNode extends vscode.TreeItem {
  constructor(column: TableColumn) {
    super(column.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'column';
    this.description = `${column.dataType}${column.nullable ? '' : ' not null'}`;
    this.iconPath = new vscode.ThemeIcon(column.isPrimaryKey ? 'key' : 'symbol-field');
    this.tooltip = column.defaultValue ? `Default: ${column.defaultValue}` : undefined;
  }
}
