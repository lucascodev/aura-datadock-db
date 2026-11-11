import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../../domain/connection/model/ConnectionTarget';
import { l10n } from '../../../../../domain/i18n/translation/l10n';

export class DatabaseNode extends vscode.TreeItem {
  constructor(
    readonly target: ConnectionTarget,
    readonly database: string,
    isActive: boolean,
  ) {
    super(database, vscode.TreeItemCollapsibleState.None);

    this.id = `database:${target.id}`;
    this.contextValue = 'database';
    this.description = describe(target, isActive);
    this.iconPath = new vscode.ThemeIcon('database', isActive ? new vscode.ThemeColor('charts.green') : undefined);
    this.tooltip = l10n.t('Database: `{0}`', database);
    this.command = { command: 'auraDataDockDb.activateConnection', title: l10n.t('Select Connection'), arguments: [target.id] };
  }
}

function describe(target: ConnectionTarget, isActive: boolean): string | undefined {
  const marks = [isActive ? '●' : undefined, target.parentId ? undefined : l10n.t('default')].filter((mark) => mark !== undefined);
  return marks.length > 0 ? marks.join(' ') : undefined;
}
