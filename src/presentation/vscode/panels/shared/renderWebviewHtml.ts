import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { escapeMarkup } from '../../../../application/format/text/escapeMarkup';

const NONCE_BYTES = 16;

interface WebviewPage {
  readonly title: string;
  readonly scriptPath: readonly string[];
  readonly stylePath: readonly string[];
  readonly chartScriptPath?: readonly string[];
  readonly allowsEditorStyles?: boolean;
}

export function renderWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, page: WebviewPage): string {
  const nonce = randomBytes(NONCE_BYTES).toString('base64');
  const styleNonce = page.allowsEditorStyles ? randomBytes(NONCE_BYTES).toString('base64') : undefined;
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.scriptPath));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.stylePath));
  const chartScriptAttribute = page.chartScriptPath
    ? ` data-chart-script="${escapeMarkup(String(webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...page.chartScriptPath))))}"`
    : '';
  const messages = vscode.l10n.bundle;
  const l10nAttribute = messages ? ` data-l10n="${escapeMarkup(JSON.stringify(messages))}"` : '';
  const styleNonceAttribute = styleNonce ? ` data-style-nonce="${escapeMarkup(styleNonce)}"` : '';
  const contentSecurityPolicy = buildContentSecurityPolicy(webview, nonce, styleNonce);

  return `<!DOCTYPE html>
<html lang="${escapeMarkup(vscode.env.language)}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeMarkup(page.title)}</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body${chartScriptAttribute}${l10nAttribute}${styleNonceAttribute}>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function buildContentSecurityPolicy(webview: vscode.Webview, nonce: string, styleNonce?: string): string {
  return [
    `default-src 'none'`,
    `style-src ${webview.cspSource}${styleNonce ? ` 'nonce-${styleNonce}'` : ''}`,
    `script-src 'nonce-${nonce}'`,
    `img-src blob: data:`,
  ].join('; ');
}
