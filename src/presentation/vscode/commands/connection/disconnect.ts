import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function disconnect(context: DataDockContext, node: ConnectionNode): Promise<void> {
  const closedIds = await context.connections.closeWithDatabases(node.target.id);
  closedIds.forEach((id) => context.schemas.invalidate(id));
  await context.refresh();
  vscode.window.setStatusBarMessage(l10n.t('Disconnected from {0}', node.target.name), 3000);
}
