import type * as vscode from 'vscode';
import type { AiProvider } from '../application/ai/AiProvider';
import type { AiProviderKind } from '../application/ai/AiProviderKind';
import { AnthropicProvider } from '../infrastructure/ai/AnthropicProvider';
import { apiKeySecretName } from '../application/ai/apiKeySecretName';
import { OllamaProvider } from '../infrastructure/ai/OllamaProvider';
import { OpenAiProvider } from '../infrastructure/ai/OpenAiProvider';
import { VsCodeLmProvider } from '../presentation/vscode/ai/VsCodeLmProvider';

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
