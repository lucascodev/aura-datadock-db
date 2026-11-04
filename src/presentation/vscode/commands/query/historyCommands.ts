import * as vscode from 'vscode';
import type { QueryHistoryEntry } from '../../../../application/query/history/QueryHistoryEntry';
import type { DataDockContext } from '../registry/DataDockContext';
import { openBoundDocument } from './newQuery';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function openHistoryEntry(context: DataDockContext, entry: QueryHistoryEntry): Promise<void> {
  await openBoundDocument(context, entry.connectionKey, `${entry.sql}\n`);
}

export async function clearHistory(context: DataDockContext): Promise<void> {
  const clearLabel = l10n.t('Clear');
  const answer = await vscode.window.showWarningMessage(l10n.t('Clear the query history?'), { modal: true }, clearLabel);
  if (answer === clearLabel) {
    await context.history.clear();
  }
}
