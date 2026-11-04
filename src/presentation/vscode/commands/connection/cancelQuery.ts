import * as vscode from 'vscode';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export function cancelQuery(context: DataDockContext): void {
  if (!context.runs.cancel()) {
    vscode.window.setStatusBarMessage(l10n.t('No query is running'), 3000);
  }
}
