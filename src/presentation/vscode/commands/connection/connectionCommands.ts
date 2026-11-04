import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { type DataDockContext } from '../registry/DataDockContext';
import { savedPasswordSecretName } from '../registry/passwordSecretName';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export function addConnection(context: DataDockContext): void {
  context.connectionForm.open();
}

export function editConnection(context: DataDockContext, node: ConnectionNode): void {
  const connection = context.savedConnections.find(node.target.id);
  if (connection) {
    context.connectionForm.open(connection);
  }
}

export async function removeConnection(context: DataDockContext, node: ConnectionNode): Promise<void> {
  const { target } = node;
  const removeLabel = l10n.t('Remove');
  const answer = await vscode.window.showWarningMessage(
    l10n.t('Remove the connection {0}?', target.name),
    { modal: true, detail: l10n.t('Its stored password is removed too. The database is not changed.') },
    removeLabel,
  );
  if (answer !== removeLabel) {
    return;
  }
  await context.connections.close(target.id);
  await context.savedConnections.remove(target.id);
  await context.secrets.delete(savedPasswordSecretName(target.id));
  await context.diagrams.forgetPositions(target);
  context.schemas.invalidate(target.id);
  await context.refresh();
}

export async function disconnect(context: DataDockContext, node: ConnectionNode): Promise<void> {
  await context.connections.close(node.target.id);
  context.schemas.invalidate(node.target.id);
  await context.refresh();
  vscode.window.setStatusBarMessage(l10n.t('Disconnected from {0}', node.target.name), 3000);
}
