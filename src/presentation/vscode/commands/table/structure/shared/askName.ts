import * as vscode from 'vscode';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';

export async function askName(prompt: string, value?: string): Promise<string | undefined> {
  const name = await vscode.window.showInputBox({
    prompt,
    value,
    validateInput: (text) => (text.trim() ? undefined : l10n.t('Enter a name.')),
  });
  return name?.trim();
}
