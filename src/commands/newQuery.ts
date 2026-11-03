import * as vscode from 'vscode';
import type { ContainerNode } from '../ui/tree/ContainerNode';
import type { DataDockContext } from './DataDockContext';
import { resolveConnection } from './pickConnection';

export async function newQuery(context: DataDockContext, node?: ContainerNode, initialSql = ''): Promise<void> {
  if (node) {
    context.connections.setActive(node.target.id);
  }
  const target = node?.target ?? (await resolveConnection(context));
  if (!target) {
    return;
  }

  const header = `-- ${target.containerName} (${target.kind}) · Ctrl+Enter runs the selection or the whole file\n`;
  const document = await vscode.workspace.openTextDocument({ language: 'sql', content: `${header}${initialSql}` });
  await vscode.window.showTextDocument(document);
}
