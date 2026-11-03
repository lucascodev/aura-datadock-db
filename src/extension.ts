import * as vscode from 'vscode';
import { passwordSecretName, type DataDockContext } from './commands/DataDockContext';
import { registerCommands } from './commands/registerCommands';
import { ConnectionManager } from './core/ConnectionManager';
import { ContainerDiscovery } from './docker/ContainerDiscovery';
import { DockerClient } from './docker/DockerClient';
import { resolveDockerEndpoint } from './docker/resolveDockerEndpoint';
import { registerMcpProvider } from './mcp/registerMcpProvider';
import { DataDockTreeProvider } from './ui/tree/DataDockTreeProvider';

const AUTO_REFRESH_MS = 15_000;

let connections: ConnectionManager | undefined;

export async function activate(extension: vscode.ExtensionContext): Promise<void> {
  const config = () => vscode.workspace.getConfiguration('auraDataDock');
  const output = vscode.window.createOutputChannel('Aura DataDock', { log: true });

  const createDiscovery = () => new ContainerDiscovery(new DockerClient(resolveDockerEndpoint(config().get<string>('dockerHost'))));

  connections = new ConnectionManager(
    createDiscovery(),
    { get: (target) => extension.secrets.get(passwordSecretName(target.containerName)) },
    { readOnly: () => config().get<boolean>('readOnly', false) },
  );
  const manager = connections;

  const tree = new DataDockTreeProvider(manager);
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBar.command = 'auraDataDock.selectConnection';

  const updateStatusBar = () => {
    const active = manager.activeTarget;
    statusBar.text = `$(database) ${active?.containerName ?? 'No database'}`;
    statusBar.tooltip = active ? `Aura DataDock: ${active.kind} on ${active.host}:${active.port}` : 'Aura DataDock: select a connection';
    statusBar.show();
  };

  const refresh = async () => {
    try {
      await manager.refresh();
      tree.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.warn(message);
      tree.refresh(message);
    }
  };

  const context: DataDockContext = { connections: manager, secrets: extension.secrets, output, refresh, config };

  extension.subscriptions.push(
    output,
    statusBar,
    vscode.window.registerTreeDataProvider('auraDataDock.connections', tree),
    manager.onDidChange(() => {
      updateStatusBar();
      tree.refresh();
    }),
    ...registerCommands(context),
    registerMcpProvider(extension),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('auraDataDock.readOnly') || event.affectsConfiguration('auraDataDock.dockerHost')) {
        await manager.closeAll();
        await refresh();
      }
    }),
  );

  const timer = setInterval(() => void refresh(), AUTO_REFRESH_MS);
  extension.subscriptions.push({ dispose: () => clearInterval(timer) });

  updateStatusBar();
  await refresh();
}

export async function deactivate(): Promise<void> {
  await connections?.closeAll();
}
