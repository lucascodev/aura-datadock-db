import * as vscode from 'vscode';
import { createAiProvider } from './createAiProvider';
import { type DataDockContext } from '../presentation/vscode/commands/model/DataDockContext';
import { passwordSecretName, savedPasswordSecretName } from '../presentation/vscode/commands/registry/passwordSecretName';
import { executeQuery } from '../presentation/vscode/commands/query/executeQuery';
import { exportRows } from '../presentation/vscode/commands/table/exportTable';
import { openBoundDocument } from '../presentation/vscode/commands/query/newQuery';
import { openTableOf } from '../presentation/vscode/commands/table/openTable';
import { findDocumentConnection } from '../presentation/vscode/commands/registry/pickConnection';
import { registerCommands } from '../presentation/vscode/commands/registry/registerCommands';
import { saveSchemaExport } from '../presentation/vscode/commands/schema/schemaCommands';
import { SavedConnections } from '../application/connections/saved/SavedConnections';
import { ConnectionManager } from '../application/connections/lifecycle/ConnectionManager';
import { QueryDocumentBindings } from '../application/query/documents/QueryDocumentBindings';
import { QueryHistory } from '../application/query/history/QueryHistory';
import { QueryRunTracker } from '../application/query/execution/QueryRunTracker';
import { SchemaCache } from '../application/schema/loading/SchemaCache';
import { resolveProtectionSetting } from '../application/settings/resolveProtectionSetting';
import type { ConnectionSource } from '../domain/connection/ports/ConnectionSource';
import { l10n, useL10nCatalog } from '../domain/i18n/translation/l10n';
import { ContainerDiscovery } from '../infrastructure/docker/discovery/ContainerDiscovery';
import { DockerClient } from '../infrastructure/docker/client/DockerClient';
import { resolveDockerEndpoint } from '../infrastructure/docker/client/resolveDockerEndpoint';
import { registerMcpProvider } from '../presentation/vscode/mcp/registerMcpProvider';
import { openAdapter } from '../infrastructure/ssh/tunnel/openAdapter';
import { ConnectionFormPanel } from '../presentation/vscode/panels/connection/ConnectionFormPanel';
import { DiagramPanels } from '../presentation/vscode/panels/diagram/DiagramPanels';
import { HistoryTreeProvider } from '../presentation/vscode/tree/providers/HistoryTreeProvider';
import { SqlCodeLensProvider } from '../presentation/vscode/editor/SqlCodeLensProvider';
import { SqlCompletionProvider } from '../presentation/vscode/editor/SqlCompletionProvider';
import { ResultsPanel } from '../presentation/vscode/panels/results/ResultsPanel';
import { TableEditors } from '../presentation/vscode/panels/table/TableEditors';
import { DataDockTreeProvider } from '../presentation/vscode/tree/providers/DataDockTreeProvider';
import { SchemaTreeProvider } from '../presentation/vscode/tree/providers/SchemaTreeProvider';

const AUTO_REFRESH_MS = 15_000;
const SQL_SELECTOR: vscode.DocumentSelector = { language: 'sql' };
const COMPLETION_TRIGGER_CHARACTER = '.';
const SQL_LANGUAGE_ID = 'sql';
const CONNECTIONS_SETTING = 'connections';
const REMOTE_STATUS_BACKGROUND = new vscode.ThemeColor('statusBarItem.warningBackground');

let connections: ConnectionManager | undefined;

export async function activate(extension: vscode.ExtensionContext): Promise<void> {
  useL10nCatalog({ locale: vscode.env.language, messages: vscode.l10n.bundle });
  const config = () => vscode.workspace.getConfiguration('auraDataDockDb');
  const output = vscode.window.createOutputChannel('Aura DataDock DB', { log: true });

  const dockerSource: ConnectionSource = {
    kind: 'docker',
    discover: () => new ContainerDiscovery(new DockerClient(resolveDockerEndpoint(config().get<string>('dockerHost')))).discover(),
  };
  const savedConnections = new SavedConnections({
    read: () => config().get<unknown[]>(CONNECTIONS_SETTING, []),
    write: (list) => config().update(CONNECTIONS_SETTING, list, vscode.ConfigurationTarget.Global),
  });

  connections = new ConnectionManager(
    [savedConnections, dockerSource],
    { get: (target) => extension.secrets.get(passwordSecretName(target)) },
    { readOnly: (target) => resolveProtectionSetting(config().inspect<boolean>('readOnly'), false) || target.isReadOnly, openAdapter },
  );
  const manager = connections;

  const listNamespaces = async (targetId: string) => (await manager.getAdapter(targetId)).listNamespaces();
  const schemas = new SchemaCache(async (targetId, namespace) => (await manager.getAdapter(targetId)).readSchema(namespace));
  const bindings = new QueryDocumentBindings();
  const history = new QueryHistory(extension.globalState, () => config().get<number>('history.maxEntries', 200));
  const runs = new QueryRunTracker();
  const results = new ResultsPanel(extension.extensionUri);

  const tree = new DataDockTreeProvider(manager, () => Boolean(config().get<string>('dockerHost')));
  const schemaTree = new SchemaTreeProvider(manager, schemas);
  const schemaView = vscode.window.createTreeView('auraDataDockDb.schema', { treeDataProvider: schemaTree, showCollapseAll: true });
  const historyTree = new HistoryTreeProvider(history);
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBar.command = 'auraDataDockDb.selectConnection';

  const refreshTrees = () => {
    tree.refresh();
    schemaTree.refresh();
  };

  const refresh = async () => {
    await manager.refresh();
    refreshTrees();
  };

  const diagrams = new DiagramPanels({
    extensionUri: extension.extensionUri,
    storage: extension.workspaceState,
    listNamespaces,
    loadSchema: (targetId, namespace) => schemas.get(targetId, namespace),
    invalidateSchema: (targetId) => schemas.invalidate(targetId),
    openTable: (target, table) => openTableOf(context, target, table),
    saveSchemaExport,
  });

  const tableEditors = new TableEditors({
    extensionUri: extension.extensionUri,
    getAdapter: (targetId) => manager.getAdapter(targetId),
    loadSchema: (target, namespace) => schemas.get(target.id, namespace),
    isReadOnly: (target) => resolveProtectionSetting(config().inspect<boolean>('readOnly'), false) || target.isReadOnly,
    confirmsDestructive: () => resolveProtectionSetting(config().inspect<boolean>('confirmDestructiveQueries'), true),
    pageSize: () => config().get<number>('table.pageSize', 100),
    openSql: (target, sql) => openBoundDocument(context, target.key, sql),
    runScript: (target, sql) => executeQuery(context, target, sql),
    exportRows: (target, table, statement) => exportRows(context, target, table, statement),
    openTable: (target, table) => openTableOf(context, target, table),
    copyText: (text) => vscode.env.clipboard.writeText(text),
    recordHistory: (entry) => history.add(entry),
    log: (message) => output.warn(message),
  });

  const connectionForm = new ConnectionFormPanel({
    extensionUri: extension.extensionUri,
    saved: savedConnections,
    openAdapter,
    readPassword: (connectionId) => extension.secrets.get(savedPasswordSecretName(connectionId)),
    storePassword: (connectionId, password) => extension.secrets.store(savedPasswordSecretName(connectionId), password),
    onSaved: async (connection) => {
      await manager.close(connection.id);
      schemas.invalidate(connection.id);
      await refresh();
      vscode.window.setStatusBarMessage(l10n.t('Saved connection {0}', connection.name), 3000);
    },
  });

  const context: DataDockContext = {
    connections: manager,
    savedConnections,
    connectionForm,
    secrets: extension.secrets,
    output,
    schemas,
    bindings,
    history,
    runs,
    results,
    diagrams,
    tableEditors,
    schemaTree,
    refresh,
    config,
    createAiProvider: () => createAiProvider(config(), extension.secrets),
  };

  const connectionFor = (document: vscode.TextDocument) => findDocumentConnection(context, document);

  const codeLenses = new SqlCodeLensProvider({
    isEnabled: () => config().get<boolean>('codeLens.enabled', true),
    connectionFor,
  });

  const completions = new SqlCompletionProvider({
    connectionFor,
    isBusy: () => runs.isRunning,
    listNamespaces,
    loadSchema: (targetId, namespace) => schemas.get(targetId, namespace),
    reportError: (error) => output.warn(`Autocomplete: ${error instanceof Error ? error.message : String(error)}`),
  });

  const updateStatusBar = () => {
    const document = vscode.window.activeTextEditor?.document;
    const active = document?.languageId === SQL_LANGUAGE_ID ? findDocumentConnection(context, document) : manager.activeTarget;
    statusBar.text = `$(${active?.isRemote ? 'remote' : 'database'}) ${active?.name ?? l10n.t('No database')}`;
    statusBar.tooltip = active ? l10n.t('Aura DataDock DB: {0} on {1}:{2}', active.kind, active.host ?? '', active.port ?? '') : l10n.t('Aura DataDock DB: select a connection');
    statusBar.backgroundColor = active?.isRemote ? REMOTE_STATUS_BACKGROUND : undefined;
    statusBar.show();
  };

  const updateSchemaViewDescription = () => {
    const parts = [manager.activeTarget?.name, schemaTree.filter ? l10n.t('filter: {0}', schemaTree.filter) : undefined].filter((part) => part !== undefined);
    schemaView.description = parts.join(' · ');
  };

  const handleConnectionChange = () => {
    updateStatusBar();
    updateSchemaViewDescription();
    codeLenses.refresh();
  };

  let lastDockerError: string | undefined;
  const logDockerAvailability = () => {
    const dockerError = manager.getSourceError('docker');
    if (dockerError !== lastDockerError) {
      lastDockerError = dockerError;
      output.info(dockerError ? `Docker is not available: ${dockerError}` : 'Docker is available');
    }
  };

  extension.subscriptions.push(
    output,
    statusBar,
    results,
    connectionForm,
    vscode.window.createTreeView('auraDataDockDb.connections', { treeDataProvider: tree, showCollapseAll: true }),
    vscode.window.registerTreeDataProvider('auraDataDockDb.history', historyTree),
    schemaView,
    schemaTree.onDidChangeTreeData(updateSchemaViewDescription),
    vscode.languages.registerCodeLensProvider(SQL_SELECTOR, codeLenses),
    vscode.languages.registerCompletionItemProvider(SQL_SELECTOR, completions, COMPLETION_TRIGGER_CHARACTER),
    history.onDidChange(() => historyTree.refresh()),
    bindings.onDidChange(handleConnectionChange),
    manager.onDidChange(() => {
      logDockerAvailability();
      handleConnectionChange();
      refreshTrees();
    }),
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
    vscode.workspace.onDidCloseTextDocument((document) => bindings.unbind(document.uri.toString())),
    ...registerCommands(context),
    registerMcpProvider(extension),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('auraDataDockDb.codeLens')) {
        codeLenses.refresh();
      }
      if (event.affectsConfiguration('auraDataDockDb.connections')) {
        await refresh();
      }
      if (event.affectsConfiguration('auraDataDockDb.readOnly') || event.affectsConfiguration('auraDataDockDb.dockerHost')) {
        await manager.closeAll();
        await refresh();
      }
    }),
  );

  const timer = setInterval(() => void manager.refresh(), AUTO_REFRESH_MS);
  extension.subscriptions.push({ dispose: () => clearInterval(timer) });

  updateStatusBar();
  await refresh();
}

export async function deactivate(): Promise<void> {
  await connections?.closeAll();
}
