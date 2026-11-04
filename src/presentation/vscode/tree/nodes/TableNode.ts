import * as vscode from 'vscode';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export class TableNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly table: TableRef,
  ) {
    super(table.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `table:${targetId}:${table.namespace}.${table.name}`;
    this.contextValue = table.kind;
    this.iconPath = new vscode.ThemeIcon(table.kind === 'view' ? 'eye' : 'table');
    this.description = table.kind === 'view' ? l10n.t('view') : undefined;
    this.command = { command: 'auraDataDockDb.openTable', title: l10n.t('Open Data'), arguments: [this] };
  }
}
