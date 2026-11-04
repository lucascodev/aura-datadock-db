import type * as vscode from 'vscode';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { registerCommands } from '../../../presentation/vscode/commands/registry/registerCommands';
import { registerMcpProvider } from '../../../presentation/vscode/mcp/registerMcpProvider';
import type { EditorProviders } from '../model/EditorProviders';
import type { RefreshActions } from '../model/RefreshActions';
import type { Views } from '../model/Views';
import { registerConfigurationListener } from './registerConfigurationListener';
import { registerConnectionListeners } from './registerConnectionListeners';
import { registerEditorProviders } from './registerEditorProviders';
import { registerTreeViews } from './registerTreeViews';
import { startAutoRefresh } from './startAutoRefresh';

export function registerSubscriptions(
  extension: vscode.ExtensionContext,
  context: DataDockContext,
  views: Views,
  providers: EditorProviders,
  refreshActions: RefreshActions,
): void {
  extension.subscriptions.push(
    context.output,
    views.statusBar,
    context.results,
    context.connectionForm,
    ...registerTreeViews(views, context),
    ...registerEditorProviders(providers),
    ...registerConnectionListeners(context, views, providers, refreshActions),
    ...registerCommands(context),
    registerMcpProvider(extension),
    registerConfigurationListener(context, providers),
  );
  extension.subscriptions.push(startAutoRefresh(context.connections));
}
