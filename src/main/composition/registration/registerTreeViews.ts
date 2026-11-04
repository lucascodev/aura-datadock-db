import * as vscode from 'vscode';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { updateSchemaViewDescription } from '../status/updateSchemaViewDescription';
import type { Views } from '../model/Views';

export function registerTreeViews(views: Views, context: DataDockContext): vscode.Disposable[] {
  return [
    vscode.window.createTreeView('auraDataDockDb.connections', { treeDataProvider: views.tree, showCollapseAll: true }),
    vscode.window.registerTreeDataProvider('auraDataDockDb.history', views.historyTree),
    views.schemaView,
    views.schemaTree.onDidChangeTreeData(() => updateSchemaViewDescription(views.schemaView, context)),
  ];
}
