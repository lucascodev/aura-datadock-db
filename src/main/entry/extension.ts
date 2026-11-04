import * as vscode from 'vscode';
import { createAiProvider } from '../composition/services/createAiProvider';
import { createConnectionServices } from '../composition/services/createConnectionServices';
import type { ConnectionManager } from '../../application/connections/lifecycle/ConnectionManager';
import { useL10nCatalog } from '../../domain/i18n/translation/l10n';
import { openAdapter } from '../../infrastructure/ssh/tunnel/openAdapter';
import type { HostEnvironment } from '../composition/model/HostEnvironment';
import { registerSubscriptions } from '../composition/registration/registerSubscriptions';
import { composeContext } from '../composition/services/composeContext';
import { createEditorProviders } from '../composition/services/createEditorProviders';
import { createRefreshActions } from '../composition/services/createRefreshActions';
import { createViews } from '../composition/services/createViews';
import { createWorkspaceServices } from '../composition/services/createWorkspaceServices';
import { updateStatusBar } from '../composition/status/updateStatusBar';

let connections: ConnectionManager | undefined;

export async function activate(extension: vscode.ExtensionContext): Promise<void> {
  useL10nCatalog({ locale: vscode.env.language, messages: vscode.l10n.bundle });
  const config = () => vscode.workspace.getConfiguration('auraDataDockDb');
  const output = vscode.window.createOutputChannel('Aura DataDock DB', { log: true });
  const host: HostEnvironment = { extension, output, config };

  const connection = createConnectionServices(host);
  connections = connection.manager;
  const workspace = createWorkspaceServices(host, connection.manager);
  const views = createViews(host, connection.manager, workspace);
  const refreshActions = createRefreshActions(connection.manager, views);
  const context = composeContext({
    host,
    connection,
    workspace,
    schemaTree: views.schemaTree,
    refresh: refreshActions.refresh,
    openAdapter,
    createAiProvider: () => createAiProvider(config(), extension.secrets),
  });
  const providers = createEditorProviders(context, workspace);

  registerSubscriptions(extension, context, views, providers, refreshActions);

  updateStatusBar(views.statusBar, context);
  await refreshActions.refresh();
}

export async function deactivate(): Promise<void> {
  await connections?.closeAll();
}
