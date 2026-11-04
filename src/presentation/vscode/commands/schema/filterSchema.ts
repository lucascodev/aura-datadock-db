import * as vscode from 'vscode';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function filterSchema(context: DataDockContext): Promise<void> {
  const filter = await vscode.window.showInputBox({
    prompt: l10n.t('Show only tables whose name contains this text. Leave empty to show all.'),
    value: context.schemaTree.filter,
  });
  if (filter !== undefined) {
    context.schemaTree.setFilter(filter);
  }
}
