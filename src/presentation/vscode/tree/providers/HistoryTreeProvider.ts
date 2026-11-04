import * as vscode from 'vscode';
import type { QueryHistory } from '../../../../application/query/history/QueryHistory';
import type { QueryHistoryEntry } from '../../../../application/query/history/QueryHistoryEntry';
import { summarizeSql } from '../../../../application/query/analysis/summarizeSql';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const LABEL_CHARACTERS = 80;

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly history: QueryHistory) {}

  refresh(): void {
    this.changeEmitter.fire();
  }

  getTreeItem(element: HistoryNode): vscode.TreeItem {
    return element;
  }

  getChildren(): HistoryNode[] {
    return this.history.list().map((entry) => new HistoryNode(entry));
  }
}

class HistoryNode extends vscode.TreeItem {
  constructor(entry: QueryHistoryEntry) {
    super(summarizeSql(entry.sql, LABEL_CHARACTERS), vscode.TreeItemCollapsibleState.None);
    this.description = `${entry.connectionName} · ${entry.durationMs} ms · ${new Date(entry.executedAt).toLocaleString(l10n.locale())}`;
    this.iconPath = new vscode.ThemeIcon(entry.errorMessage ? 'error' : 'history');
    this.id = `${entry.executedAt}:${entry.connectionKey}`;
    this.tooltip = entry.errorMessage ? `${entry.sql}\n\n${entry.errorMessage}` : entry.sql;
    this.contextValue = 'historyEntry';
    this.command = { command: 'auraDataDockDb.openHistoryEntry', title: l10n.t('Open Query'), arguments: [entry] };
  }
}
