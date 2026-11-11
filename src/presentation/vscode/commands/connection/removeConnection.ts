import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import type { DataDockContext } from '../model/DataDockContext';
import { savedPasswordSecretName } from '../registry/savedPasswordSecretName';
import { l10n } from '../../../../domain/i18n/translation/l10n';

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
