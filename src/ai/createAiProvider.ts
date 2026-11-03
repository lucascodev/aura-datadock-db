import type * as vscode from 'vscode';
import type { AiProvider } from './AiProvider';
import type { AiProviderKind } from './AiProviderKind';
import { AnthropicProvider } from './AnthropicProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAiProvider } from './OpenAiProvider';
import { VsCodeLmProvider } from './VsCodeLmProvider';

export function apiKeySecretName(provider: AiProviderKind): string {
  return `auraDataDock.ai.apiKey.${provider}`;
}

export async function createAiProvider(
  config: vscode.WorkspaceConfiguration,
  secrets: vscode.SecretStorage,
): Promise<AiProvider> {
  const kind = config.get<AiProviderKind>('ai.provider', 'vscode');
  const model = config.get<string>('ai.model', '');

  switch (kind) {
    case 'anthropic':
      return new AnthropicProvider(await secrets.get(apiKeySecretName(kind)), model);
    case 'openai':
      return new OpenAiProvider(await secrets.get(apiKeySecretName(kind)), model);
    case 'ollama':
      return new OllamaProvider(config.get<string>('ai.ollamaUrl', 'http://localhost:11434'), model);
    case 'vscode':
    default:
      return new VsCodeLmProvider(model);
  }
}
