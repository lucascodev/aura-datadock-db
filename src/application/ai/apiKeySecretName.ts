import type { AiProviderKind } from './AiProviderKind';

export function apiKeySecretName(provider: AiProviderKind): string {
  return `auraDataDockDb.ai.apiKey.${provider}`;
}
