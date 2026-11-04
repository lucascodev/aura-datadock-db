import * as vscode from 'vscode';
import { encodeRows } from '../../../../application/export/encoders/encodeRows';
import { ROW_EXPORT_FORMATS } from '../../../../application/export/constants/rowExportFormats';
import type { RowExportFormatId } from '../../../../application/export/model/RowExportFormat';
import type { StatementOutcome } from '../../../../application/query/model/StatementOutcome';
import type { DriverId } from '../../../../domain/driver/model/DriverId';
import { renderWebviewHtml, webviewResourceRoots } from '../shared/renderWebviewHtml';
import { saveImageFile } from '../shared/saveImageFile';
import type { ImageFormat } from '../shared/ImageFormat';
import type { ResultsHostMessage, ResultsViewState, ResultsWebviewMessage } from '../../../contracts/ResultsMessages';
import { toResultSetView } from './toResultSetView';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const VIEW_TYPE = 'auraDataDockDb.results';
const CANCEL_COMMAND = 'auraDataDockDb.cancelQuery';
const CHART_FILE_NAME = 'query-chart';

export class ResultsPanel {
  private panel?: vscode.WebviewPanel;
  private state?: ResultsViewState;
  private outcomes: readonly StatementOutcome[] = [];
  private kind?: DriverId;

  constructor(private readonly extensionUri: vscode.Uri) {}

  showRunning(connectionName: string, sql: string): void {
    this.outcomes = [];
    this.publish({ phase: 'running', connectionName, sql });
    this.reveal(l10n.t('Running · {0}', connectionName));
  }

  showOutcomes(connectionName: string, kind: DriverId, outcomes: readonly StatementOutcome[]): void {
    this.outcomes = outcomes;
    this.kind = kind;
    this.publish({
      phase: 'done',
      connectionName,
      results: outcomes.map(toResultSetView),
      exportFormats: ROW_EXPORT_FORMATS.map(({ id, label }) => ({ id, label: label() })),
    });
    this.reveal(l10n.t('Results · {0}', connectionName));
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private reveal(title: string): void {
    const panel = this.panel ?? this.createPanel(title);
    panel.title = title;
    panel.reveal(vscode.ViewColumn.Beside, true);
  }

  private createPanel(title: string): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: webviewResourceRoots(this.extensionUri) },
    );
    panel.webview.html = renderWebviewHtml(panel.webview, this.extensionUri, {
      title,
      scriptPath: ['dist', 'webview', 'results.js'],
      stylePath: ['media', 'webview', 'results.css'],
      chartScriptPath: ['dist', 'webview', 'chart.js'],
    });
    panel.webview.onDidReceiveMessage((message: ResultsWebviewMessage) => this.handleMessage(message));
    panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.panel = panel;
    return panel;
  }

  private publish(state: ResultsViewState): void {
    this.state = state;
    const message: ResultsHostMessage = { type: 'state', state };
    void this.panel?.webview.postMessage(message);
  }

  private async handleMessage(message: ResultsWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        if (this.state) {
          this.publish(this.state);
        }
        return;
      case 'cancel':
        await vscode.commands.executeCommand(CANCEL_COMMAND);
        return;
      case 'copyText':
        await vscode.env.clipboard.writeText(message.text);
        return;
      case 'openValue':
        await openValueInEditor(message.text);
        return;
      case 'exportResult':
        await this.exportResult(message.resultIndex, message.format, message.destination);
        return;
      case 'saveChartImage':
        await saveChartImage(message.format, message.content);
        return;
    }
  }

  private async exportResult(resultIndex: number, formatId: RowExportFormatId, destination: 'file' | 'clipboard'): Promise<void> {
    const outcome = this.outcomes[resultIndex];
    const format = ROW_EXPORT_FORMATS.find((candidate) => candidate.id === formatId);
    if (!format || !this.kind || outcome?.status !== 'success') {
      return;
    }

    const content = encodeRows(format.createEncoder({ kind: this.kind }), outcome.result);
    if (destination === 'clipboard') {
      await vscode.env.clipboard.writeText(content);
      vscode.window.setStatusBarMessage(l10n.t('Copied {0} row(s) as {1}', outcome.result.rows.length, format.label()), 3000);
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`query-result.${format.extension}`),
      filters: { [format.label()]: [format.extension] },
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.setStatusBarMessage(l10n.t('Saved {0} row(s) to {1}', outcome.result.rows.length, uri.fsPath), 3000);
    }
  }
}

async function saveChartImage(format: ImageFormat, content: string): Promise<void> {
  const uri = await saveImageFile(CHART_FILE_NAME, format, content);
  if (uri) {
    vscode.window.setStatusBarMessage(l10n.t('Saved chart to {0}', uri.fsPath), 3000);
  }
}

async function openValueInEditor(text: string): Promise<void> {
  const language = isJson(text) ? 'json' : 'plaintext';
  const document = await vscode.workspace.openTextDocument({ language, content: language === 'json' ? JSON.stringify(JSON.parse(text), null, 2) : text });
  await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Active, preview: true });
}

function isJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
