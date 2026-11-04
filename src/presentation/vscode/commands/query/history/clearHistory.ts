import * as vscode from 'vscode';
import type { DataDockContext } from '../../model/DataDockContext';
import { l10n } from '../../../../../domain/i18n/translation/l10n';

export async function clearHistory(context: DataDockContext): Promise<void> {
  const clearLabel = l10n.t('Clear');
  const answer = await vscode.window.showWarningMessage(l10n.t('Clear the query history?'), { modal: true }, clearLabel);
  if (answer === clearLabel) {
    await context.history.clear();
  }
}
