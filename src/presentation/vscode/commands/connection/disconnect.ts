import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function disconnect(context: DataDockContext, node: ConnectionNode): Promise<void> {
  await context.connections.close(node.target.id);
  context.schemas.invalidate(node.target.id);
  await context.refresh();
  vscode.window.setStatusBarMessage(l10n.t('Disconnected from {0}', node.target.name), 3000);
}
