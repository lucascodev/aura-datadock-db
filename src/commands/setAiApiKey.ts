import * as vscode from 'vscode';
import { API_KEY_PROVIDERS } from '../ai/AiProviderKind';
import { apiKeySecretName } from '../ai/createAiProvider';
import type { DataDockContext } from './DataDockContext';

export async function setAiApiKey(context: DataDockContext): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    API_KEY_PROVIDERS.map((provider) => ({ label: provider, provider })),
    { placeHolder: 'Which provider is this key for?' },
  );
  if (!picked) {
    return;
  }
  const { provider } = picked;

  const key = await vscode.window.showInputBox({
    title: `${provider} API key`,
    prompt: 'Stored in the operating system keychain through VS Code SecretStorage.',
    password: true,
    ignoreFocusOut: true,
  });
  if (!key) {
    return;
  }

  await context.secrets.store(apiKeySecretName(provider), key);
  await context.config().update('ai.provider', provider, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`${provider} key saved and set as the AI provider.`);
}
