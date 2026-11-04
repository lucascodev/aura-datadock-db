import * as vscode from 'vscode';
import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';
import { DataDockTreeProvider } from '../../../presentation/vscode/tree/providers/DataDockTreeProvider';
import { HistoryTreeProvider } from '../../../presentation/vscode/tree/providers/HistoryTreeProvider';
import { SchemaTreeProvider } from '../../../presentation/vscode/tree/providers/SchemaTreeProvider';
import type { HostEnvironment } from '../model/HostEnvironment';
import type { Views } from '../model/Views';
import type { WorkspaceServices } from '../model/WorkspaceServices';

const STATUS_BAR_PRIORITY = 50;

export function createViews(host: HostEnvironment, manager: ConnectionManager, workspace: WorkspaceServices): Views {
  const tree = new DataDockTreeProvider(manager, () => Boolean(host.config().get<string>('dockerHost')));
  const schemaTree = new SchemaTreeProvider(manager, workspace.schemas);
  const schemaView = vscode.window.createTreeView('auraDataDockDb.schema', { treeDataProvider: schemaTree, showCollapseAll: true });
  const historyTree = new HistoryTreeProvider(workspace.history);
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_PRIORITY);
  statusBar.command = 'auraDataDockDb.selectConnection';
  return { tree, schemaTree, schemaView, historyTree, statusBar };
}
