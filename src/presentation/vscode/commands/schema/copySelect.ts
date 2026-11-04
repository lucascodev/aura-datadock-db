import * as vscode from 'vscode';
import type { TableNode } from '../../tree/nodes/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { showError } from './showError';

export async function copySelect(context: DataDockContext, node: TableNode): Promise<void> {
  try {
    const adapter = await context.connections.getAdapter(node.targetId);
    const sql = adapter.buildSelectPreview(node.table, context.config().get<number>('maxRows', 500));
    await vscode.env.clipboard.writeText(sql);
    vscode.window.setStatusBarMessage(l10n.t('SELECT copied to the clipboard'), 3000);
  } catch (error) {
    showError(error);
  }
}
