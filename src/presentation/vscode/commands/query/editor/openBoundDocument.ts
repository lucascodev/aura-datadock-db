import * as vscode from 'vscode';
import type { DataDockContext } from '../../model/DataDockContext';

export async function openBoundDocument(context: DataDockContext, connectionKey: string, content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({ language: 'sql', content });
  context.bindings.bind(document.uri.toString(), connectionKey);
  await vscode.window.showTextDocument(document);
}
