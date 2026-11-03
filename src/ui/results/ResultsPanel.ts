import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { QueryResult } from '../../domain/QueryResult';
import { renderResultsHtml } from './renderResultsHtml';

export class ResultsPanel {
  private static current?: ResultsPanel;

  private constructor(private readonly panel: vscode.WebviewPanel) {
    panel.onDidDispose(() => {
      ResultsPanel.current = undefined;
    });
  }

  static show(title: string, sql: string, result: QueryResult): void {
    if (!ResultsPanel.current) {
      const panel = vscode.window.createWebviewPanel(
        'auraDataDock.results',
        title,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, retainContextWhenHidden: true },
      );
      ResultsPanel.current = new ResultsPanel(panel);
    }

    const { panel } = ResultsPanel.current;
    panel.title = title;
    panel.webview.html = renderResultsHtml(result, {
      title,
      sql,
      nonce: randomBytes(16).toString('base64'),
      cspSource: panel.webview.cspSource,
    });
    panel.reveal(vscode.ViewColumn.Beside, true);
  }
}
