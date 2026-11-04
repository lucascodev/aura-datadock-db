import * as vscode from 'vscode';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import type { EditorProviders } from '../model/EditorProviders';

export function registerConfigurationListener(context: DataDockContext, providers: EditorProviders): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('auraDataDockDb.codeLens')) {
      providers.codeLenses.refresh();
    }
    if (event.affectsConfiguration('auraDataDockDb.connections')) {
      await context.refresh();
    }
    if (event.affectsConfiguration('auraDataDockDb.readOnly') || event.affectsConfiguration('auraDataDockDb.dockerHost')) {
      await context.connections.closeAll();
      await context.refresh();
    }
  });
}
