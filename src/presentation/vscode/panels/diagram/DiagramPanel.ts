import * as vscode from 'vscode';
import type { DiagramPositions } from '../../../../application/diagram/model/DiagramModel';
import { chooseDefaultNamespace } from '../../../../application/schema/loading/chooseDefaultNamespace';
import type { SchemaExportFormatId } from '../../../../application/schema/model/SchemaExportFormat';
import { SCHEMA_EXPORT_FORMATS } from '../../../../application/schema/constants/schemaExportFormats';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { saveImageFile } from '../shared/saveImageFile';
import { renderWebviewHtml, webviewResourceRoots } from '../shared/renderWebviewHtml';
import type { DiagramHostMessage, DiagramImageFormat, DiagramWebviewMessage } from '../../../contracts/DiagramMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { DiagramPanelDependencies } from './DiagramPanelDependencies';

const VIEW_TYPE = 'auraDataDockDb.diagram';

export class DiagramPanel {
  private namespace?: string;
  private lastMessage?: DiagramHostMessage;

  constructor(
    private readonly target: ConnectionTarget,
    private readonly panel: vscode.WebviewPanel,
    private readonly dependencies: DiagramPanelDependencies,
  ) {
    panel.webview.onDidReceiveMessage((message: DiagramWebviewMessage) => this.handleMessage(message));
  }

  static create(target: ConnectionTarget, dependencies: DiagramPanelDependencies): DiagramPanel {
    const title = l10n.t('ER Diagram · {0}', target.name);
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: webviewResourceRoots(dependencies.extensionUri),
    });
    panel.webview.html = renderWebviewHtml(panel.webview, dependencies.extensionUri, {
      title,
      scriptPath: ['dist', 'webview', 'diagram.js'],
      stylePath: ['media', 'webview', 'diagram.css'],
    });
    return new DiagramPanel(target, panel, dependencies);
  }

  onDidDispose(listener: () => void): void {
    this.panel.onDidDispose(listener);
  }

  async show(namespace?: string): Promise<void> {
    this.panel.reveal();
    await this.load(namespace ?? this.namespace);
  }

  private async load(requested?: string): Promise<void> {
    this.post({ type: 'loading', namespace: requested });
    try {
      const namespaces = await this.dependencies.listNamespaces(this.target.id);
      const namespace = requested && namespaces.includes(requested) ? requested : chooseDefaultNamespace(this.target.kind, this.target.database, namespaces);
      if (!namespace) {
        this.post({ type: 'failed', message: l10n.t('This database has no schemas to show.') });
        return;
      }
      const schema = await this.dependencies.loadSchema(this.target.id, namespace);
      this.namespace = namespace;
      this.post({
        type: 'schema',
        connectionName: this.target.name,
        schema,
        namespaces,
        positions: this.readPositions(namespace),
        exportFormats: SCHEMA_EXPORT_FORMATS.map(({ id, label }) => ({ id, label: label() })),
      });
    } catch (error) {
      this.post({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }

  private post(message: DiagramHostMessage): void {
    this.lastMessage = message;
    void this.panel.webview.postMessage(message);
  }

  private async handleMessage(message: DiagramWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        if (this.lastMessage) {
          void this.panel.webview.postMessage(this.lastMessage);
        }
        return;
      case 'selectNamespace':
        await this.load(message.namespace);
        return;
      case 'refresh':
        this.dependencies.invalidateSchema(this.target.id);
        await this.load(this.namespace);
        return;
      case 'savePositions':
        await this.dependencies.storage.update(this.positionsKey(message.namespace), message.positions);
        return;
      case 'openTable':
        await this.openTable(message.namespace, message.table);
        return;
      case 'exportSchema':
        await this.exportSchema(message.namespace, message.format);
        return;
      case 'saveImage':
        await this.saveImage(message.namespace, message.format, message.content);
        return;
    }
  }

  private async openTable(namespace: string, tableName: string): Promise<void> {
    const schema = await this.dependencies.loadSchema(this.target.id, namespace);
    const table = schema.tables.find((candidate) => candidate.name === tableName);
    if (table) {
      await this.dependencies.openTable(this.target, { namespace, name: table.name, kind: table.kind });
    }
  }

  private async exportSchema(namespace: string, format: SchemaExportFormatId): Promise<void> {
    const schema = await this.dependencies.loadSchema(this.target.id, namespace);
    await this.dependencies.saveSchemaExport(schema, format);
  }

  private async saveImage(namespace: string, format: DiagramImageFormat, content: string): Promise<void> {
    const uri = await saveImageFile(`${this.target.name}-${namespace}`, format, content);
    if (uri) {
      vscode.window.setStatusBarMessage(l10n.t('Saved diagram to {0}', uri.fsPath), 3000);
    }
  }

  private readPositions(namespace: string): DiagramPositions {
    return this.dependencies.storage.get<DiagramPositions>(this.positionsKey(namespace)) ?? {};
  }

  private positionsKey(namespace: string): string {
    return `${diagramPositionsPrefix(this.target)}${namespace}`;
  }
}

export function diagramPositionsPrefix(target: Pick<ConnectionTarget, 'key'>): string {
  return `auraDataDockDb.diagram.${target.key}.`;
}
