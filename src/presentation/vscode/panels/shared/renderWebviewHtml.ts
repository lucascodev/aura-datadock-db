import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { escapeMarkup } from '../../../../application/format/escapeMarkup';

interface WebviewPage {
  readonly title: string;
  readonly scriptPath: readonly string[];
  readonly stylePath: readonly string[];
  readonly chartScriptPath?: readonly string[];
}

export function renderWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, page: WebviewPage): string {
  const nonce = randomBytes(16).toString('base64');
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.scriptPath));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.stylePath));
  const chartScriptAttribute = page.chartScriptPath
    ? ` data-chart-script="${escapeMarkup(String(webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.chartScriptPath))))}"`
    : '';
  const messages = vscode.l10n.bundle;
  const l10nAttribute = messages ? ` data-l10n="${escapeMarkup(JSON.stringify(messages))}"` : '';
  const contentSecurityPolicy = [
    `default-src 'none'`,
    `style-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `img-src blob: data:`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="${escapeMarkup(vscode.env.language)}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeMarkup(page.title)}</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body${chartScriptAttribute}${l10nAttribute}>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

export function webviewResourceRoots(extensionUri: vscode.Uri): vscode.Uri[] {
  return [vscode.Uri.joinPath(extensionUri, 'dist', 'webview'), vscode.Uri.joinPath(extensionUri, 'media', 'webview')];
}
