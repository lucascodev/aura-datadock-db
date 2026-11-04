import * as vscode from 'vscode';
import { l10n } from '../../../../../domain/i18n/translation/l10n';

export function requireEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(l10n.t('Open a SQL editor to run a query.'));
  }
  return editor;
}
