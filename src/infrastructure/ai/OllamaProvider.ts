import { type AiProvider, type AiRequest } from '../../application/ai/AiProvider';
import { AiConfigurationError } from '../../application/ai/AiConfigurationError';
import { l10n } from '../../domain/i18n/translation/l10n';

export class OllamaProvider implements AiProvider {
  readonly label = 'Ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async complete(request: AiRequest): Promise<string> {
    const model = this.model || (await this.firstInstalledModel());

    const response = await fetch(`${this.trimmedUrl}/api/chat`, {
      method: 'POST',
      signal: request.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(l10n.t('Ollama error {0}: {1}', response.status, await response.text()));
    }

    const body = (await response.json()) as { message?: { content?: string } };
    return body.message?.content ?? '';
  }

  private async firstInstalledModel(): Promise<string> {
    const response = await fetch(`${this.trimmedUrl}/api/tags`).catch(() => undefined);
    if (!response?.ok) {
      throw new AiConfigurationError(l10n.t('Could not reach Ollama at {0}. Is it running?', this.baseUrl));
    }
    const body = (await response.json()) as { models?: Array<{ name: string }> };
    const first = body.models?.[0]?.name;
    if (!first) {
      throw new AiConfigurationError(l10n.t('Ollama has no models installed. Run "ollama pull <model>" first.'));
    }
    return first;
  }

  private get trimmedUrl(): string {
    return this.baseUrl.replace(/\/+$/, '');
  }
}
