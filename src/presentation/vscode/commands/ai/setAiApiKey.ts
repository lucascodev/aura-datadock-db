import * as vscode from 'vscode';
import { API_KEY_PROVIDERS } from '../../../../application/ai/model/AiProviderKind';
import { apiKeySecretName } from '../../../../application/ai/secrets/apiKeySecretName';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function setAiApiKey(context: DataDockContext): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    API_KEY_PROVIDERS.map((provider) => ({ label: provider, provider })),
    { placeHolder: l10n.t('Which provider is this key for?') },
  );
  if (!picked) {
    return;
  }
  const { provider } = picked;

  const key = await vscode.window.showInputBox({
    title: l10n.t('{0} API key', provider),
    prompt: l10n.t('Stored in the operating system keychain through VS Code SecretStorage.'),
    password: true,
    ignoreFocusOut: true,
  });
  if (!key) {
    return;
  }

  await context.secrets.store(apiKeySecretName(provider), key);
  await context.config().update('ai.provider', provider, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(l10n.t('{0} key saved and set as the AI provider.', provider));
}
