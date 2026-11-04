import type { AiProviderKind } from '../model/AiProviderKind';

export function apiKeySecretName(provider: AiProviderKind): string {
  return `auraDataDockDb.ai.apiKey.${provider}`;
}
