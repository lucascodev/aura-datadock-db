import { AiConfigurationError, type AiProvider, type AiRequest } from '../../application/ai/AiProvider';
import { l10n } from '../../domain/i18n/l10n';

const DEFAULT_MODEL = 'claude-sonnet-5-5';

export class AnthropicProvider implements AiProvider {
  readonly label = 'Anthropic';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async complete(request: AiRequest): Promise<string> {
    if (!this.apiKey) {
      throw new AiConfigurationError(l10n.t('Anthropic API key not set. Run "Aura DataDock DB: Set AI Provider API Key".'));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model || DEFAULT_MODEL,
        max_tokens: 2048,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(l10n.t('Anthropic API error {0}: {1}', response.status, await response.text()));
    }

    const body = (await response.json()) as { content: Array<{ type: string; text?: string }> };
    return body.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
  }
}
