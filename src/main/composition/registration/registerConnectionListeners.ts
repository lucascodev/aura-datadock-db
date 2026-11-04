import * as vscode from 'vscode';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import type { EditorProviders } from '../model/EditorProviders';
import type { RefreshActions } from '../model/RefreshActions';
import type { Views } from '../model/Views';
import { createDockerAvailabilityLogger } from '../status/createDockerAvailabilityLogger';
import { updateSchemaViewDescription } from '../status/updateSchemaViewDescription';
import { updateStatusBar } from '../status/updateStatusBar';

export function registerConnectionListeners(
  context: DataDockContext,
  views: Views,
  providers: EditorProviders,
  refreshActions: RefreshActions,
): vscode.Disposable[] {
  const { bindings, history, connections: manager, output } = context;
  const handleConnectionChange = () => {
    updateStatusBar(views.statusBar, context);
    updateSchemaViewDescription(views.schemaView, context);
    providers.codeLenses.refresh();
  };
  const logDockerAvailability = createDockerAvailabilityLogger(manager, output);

  return [
    history.onDidChange(() => views.historyTree.refresh()),
    bindings.onDidChange(handleConnectionChange),
    manager.onDidChange(() => {
      logDockerAvailability();
      handleConnectionChange();
      refreshActions.refreshTrees();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar(views.statusBar, context)),
    vscode.workspace.onDidCloseTextDocument((document) => bindings.unbind(document.uri.toString())),
  ];
}
