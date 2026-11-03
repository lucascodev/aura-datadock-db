import * as vscode from 'vscode';

const PROVIDER_ID = 'auraDataDock.mcp';

export function registerMcpProvider(extension: vscode.ExtensionContext): vscode.Disposable {
  const changed = new vscode.EventEmitter<void>();

  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('auraDataDock.mcp') || event.affectsConfiguration('auraDataDock.dockerHost')) {
      changed.fire();
    }
  });

  const provider = vscode.lm.registerMcpServerDefinitionProvider(PROVIDER_ID, {
    onDidChangeMcpServerDefinitions: changed.event,
    provideMcpServerDefinitions: () => {
      const config = vscode.workspace.getConfiguration('auraDataDock');
      if (!config.get<boolean>('mcp.enabled', true)) {
        return [];
      }
      const serverPath = vscode.Uri.joinPath(extension.extensionUri, 'dist', 'mcp-server.js').fsPath;
      return [
        new vscode.McpStdioServerDefinition(
          'Aura DataDock',
          process.execPath,
          [serverPath],
          {
            ELECTRON_RUN_AS_NODE: '1',
            DATADOCK_DOCKER_HOST: config.get<string>('dockerHost', ''),
          },
          String(extension.extension.packageJSON.version ?? '0.0.0'),
        ),
      ];
    },
  });

  return vscode.Disposable.from(provider, configListener, changed);
}
