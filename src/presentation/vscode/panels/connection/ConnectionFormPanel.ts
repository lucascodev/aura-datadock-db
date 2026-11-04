import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import type { ConnectionInput } from '../../../../application/connections/saved/ConnectionInput';
import { explainConnectionFailure } from '../../../../application/connections/guidance/explainConnectionFailure';
import type { SavedConnections } from '../../../../application/connections/saved/SavedConnections';
import { toConnectionTarget } from '../../../../application/connections/saved/toConnectionTarget';
import { validateConnectionInput } from '../../../../application/connections/saved/validateConnectionInput';
import type { ConnectionValidation } from '../../../../application/connections/saved/ConnectionValidation';
import type { ConnectionTarget } from '../../../../domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../domain/database/DatabaseAdapter';
import type { SavedConnection } from '../../../../domain/connection/SavedConnection';
import { renderWebviewHtml, webviewResourceRoots } from '../shared/renderWebviewHtml';
import type { ConnectionFileField, ConnectionFormHostMessage, ConnectionFormWebviewMessage } from '../../../contracts/ConnectionFormMessages';
import { l10n } from '../../../../domain/i18n/l10n';

const VIEW_TYPE = 'auraDataDockDb.connectionForm';
const TEST_CONNECTION_ID = 'connection-test';

export interface ConnectionFormDependencies {
  readonly extensionUri: vscode.Uri;
  readonly saved: SavedConnections;
  openAdapter(target: ConnectionTarget): Promise<DatabaseAdapter>;
  readPassword(connectionId: string): PromiseLike<string | undefined>;
  storePassword(connectionId: string, password: string): PromiseLike<void>;
  onSaved(connection: SavedConnection): Promise<void>;
}

export class ConnectionFormPanel {
  private panel?: vscode.WebviewPanel;
  private editing?: SavedConnection;

  constructor(private readonly dependencies: ConnectionFormDependencies) {}

  open(editing?: SavedConnection): void {
    this.editing = editing;
    const title = editing ? l10n.t('Edit {0}', editing.name) : l10n.t('Add New Connection');
    if (this.panel) {
      this.panel.title = title;
      this.panel.reveal();
      void this.postInit();
      return;
    }
    this.panel = this.createPanel(title);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private createPanel(title: string): vscode.WebviewPanel {
    const { extensionUri } = this.dependencies;
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: webviewResourceRoots(extensionUri),
    });
    panel.webview.html = renderWebviewHtml(panel.webview, extensionUri, {
      title,
      scriptPath: ['dist', 'webview', 'connection.js'],
      stylePath: ['media', 'webview', 'connection.css'],
    });
    panel.webview.onDidReceiveMessage((message: ConnectionFormWebviewMessage) => this.handleMessage(message));
    panel.onDidDispose(() => {
      this.panel = undefined;
    });
    return panel;
  }

  private post(message: ConnectionFormHostMessage): void {
    void this.panel?.webview.postMessage(message);
  }

  private async postInit(): Promise<void> {
    const { editing } = this;
    const hasPassword = editing ? (await this.dependencies.readPassword(editing.id)) !== undefined : false;
    this.post({ type: 'init', isEditing: editing !== undefined, input: editing ? toInput(editing) : undefined, hasPassword });
  }

  private async handleMessage(message: ConnectionFormWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.postInit();
        return;
      case 'save':
        await this.save(message.input, message.password);
        return;
      case 'test':
        await this.test(message.input, message.password);
        return;
      case 'cancel':
        this.panel?.dispose();
        return;
      case 'chooseFile':
        await this.chooseFile(message.field);
        return;
    }
  }

  private validate(input: ConnectionInput): ConnectionValidation {
    const takenNames = this.dependencies.saved
      .list()
      .filter((connection) => connection.id !== this.editing?.id)
      .map((connection) => connection.name);
    return validateConnectionInput(input, takenNames);
  }

  private async save(input: ConnectionInput, password: string): Promise<void> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      this.post({ type: 'errors', errors: validation.errors });
      return;
    }
    const connection: SavedConnection = { ...validation.connection, id: this.editing?.id ?? randomUUID() };
    try {
      if (password || !this.editing) {
        await this.dependencies.storePassword(connection.id, password);
      }
      await this.dependencies.saved.save(connection);
      await this.dependencies.onSaved(connection);
      this.panel?.dispose();
    } catch (error) {
      this.post({ type: 'testResult', isSuccess: false, message: l10n.t('Could not save: {0}', error instanceof Error ? error.message : String(error)) });
    }
  }

  private async test(input: ConnectionInput, password: string): Promise<void> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      this.post({ type: 'errors', errors: validation.errors });
      return;
    }
    this.post({ type: 'errors', errors: {} });
    const storedPassword = !password && this.editing ? await this.dependencies.readPassword(this.editing.id) : undefined;
    const target = toConnectionTarget({ ...validation.connection, id: TEST_CONNECTION_ID });

    try {
      const adapter = await this.dependencies.openAdapter({ ...target, password: password || (storedPassword ?? '') });
      try {
        await adapter.connect();
        const namespaces = await adapter.listNamespaces();
        this.post({ type: 'testResult', isSuccess: true, message: l10n.t('Connected. {0} schema(s) found.', namespaces.length) });
      } finally {
        await adapter.dispose();
      }
    } catch (error) {
      this.post({ type: 'testResult', isSuccess: false, message: explainConnectionFailure(error instanceof Error ? error.message : String(error)) });
    }
  }

  private async chooseFile(field: ConnectionFileField): Promise<void> {
    const [uri] = (await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: l10n.t('Choose file') })) ?? [];
    if (uri) {
      this.post({ type: 'fileChosen', field, path: uri.fsPath });
    }
  }
}

function toInput(connection: SavedConnection): ConnectionInput {
  return {
    name: connection.name,
    kind: connection.kind,
    host: connection.host,
    port: String(connection.port),
    user: connection.user,
    database: connection.database ?? '',
    tlsMode: connection.tlsMode,
    caFile: connection.caFile ?? '',
    isReadOnly: connection.isReadOnly,
    usesSsh: connection.ssh !== undefined,
    sshHost: connection.ssh?.host ?? '',
    sshPort: connection.ssh?.port !== undefined ? String(connection.ssh.port) : '',
    sshUser: connection.ssh?.user ?? '',
    sshIdentityFile: connection.ssh?.identityFile ?? '',
    sshJumpHost: connection.ssh?.jumpHost ?? '',
  };
}
