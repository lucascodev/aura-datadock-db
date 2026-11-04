import * as vscode from 'vscode';
import type { DataDockContext } from '../model/DataDockContext';
import { pickConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const SQL_LANGUAGE_ID = 'sql';

export async function selectConnection(context: DataDockContext): Promise<void> {
  const picked = await pickConnection(context);
  const document = vscode.window.activeTextEditor?.document;
  if (picked && document?.languageId === SQL_LANGUAGE_ID) {
    context.bindings.bind(document.uri.toString(), picked.key);
  }
}

export function cancelQuery(context: DataDockContext): void {
  if (!context.runs.cancel()) {
    vscode.window.setStatusBarMessage(l10n.t('No query is running'), 3000);
  }
}
