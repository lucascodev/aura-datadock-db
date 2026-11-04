import * as vscode from 'vscode';
import type { ConnectionSourceKind } from '../../../../domain/connection/model/ConnectionTarget';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const LABELS: Readonly<Record<ConnectionSourceKind, () => string>> = {
  docker: () => 'Docker',
  saved: () => l10n.t('Saved'),
};

const ICONS: Readonly<Record<ConnectionSourceKind, string>> = {
  docker: 'vm',
  saved: 'bookmark',
};

export class ConnectionGroupNode extends vscode.TreeItem {
  constructor(readonly source: ConnectionSourceKind) {
    super(LABELS[source](), vscode.TreeItemCollapsibleState.Expanded);
    this.id = `group:${source}`;
    this.contextValue = 'connectionGroup';
    this.iconPath = new vscode.ThemeIcon(ICONS[source]);
  }
}
