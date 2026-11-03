import * as vscode from 'vscode';
import type { DataDockContext } from './DataDockContext';
import { executeQuery } from './executeQuery';
import { resolveConnection } from './pickConnection';

export async function runQuery(context: DataDockContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a SQL editor to run a query.');
    return;
  }

  const sql = (editor.selection.isEmpty ? editor.document.getText() : editor.document.getText(editor.selection)).trim();
  if (!sql) {
    return;
  }

  const target = await resolveConnection(context);
  if (target) {
    await executeQuery(context, target, sql);
  }
}
