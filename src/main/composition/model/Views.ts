import type * as vscode from 'vscode';
import type { DataDockTreeProvider } from '../../../presentation/vscode/tree/providers/DataDockTreeProvider';
import type { HistoryTreeProvider } from '../../../presentation/vscode/tree/providers/HistoryTreeProvider';
import type { SchemaTreeProvider } from '../../../presentation/vscode/tree/providers/SchemaTreeProvider';

export interface Views {
  readonly tree: DataDockTreeProvider;
  readonly schemaTree: SchemaTreeProvider;
  readonly schemaView: vscode.Disposable & { description?: string };
  readonly historyTree: HistoryTreeProvider;
  readonly statusBar: vscode.StatusBarItem;
}
