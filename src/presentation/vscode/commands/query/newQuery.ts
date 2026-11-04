import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import type { DataDockContext } from '../registry/DataDockContext';
import { resolveConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/l10n';

export async function newQuery(context: DataDockContext, node?: ConnectionNode, initialSql = ''): Promise<void> {
  if (node) {
    context.connections.setActive(node.target.id);
  }
  const target = node?.target ?? (await resolveConnection(context));
  if (!target) {
    return;
  }

  const header = `-- ${l10n.t('{0} ({1}) · Ctrl+Enter runs the selection or the statement under the cursor, Ctrl+Shift+Enter runs the file', target.name, target.kind)}\n`;
  await openBoundDocument(context, target.key, `${header}${initialSql}`);
}

export async function openBoundDocument(context: DataDockContext, connectionKey: string, content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({ language: 'sql', content });
  context.bindings.bind(document.uri.toString(), connectionKey);
  await vscode.window.showTextDocument(document);
}
