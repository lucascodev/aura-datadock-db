import { type AiProvider, type AiRequest } from '../../application/ai/ports/AiProvider';
import { AiConfigurationError } from '../../application/ai/errors/AiConfigurationError';
import { l10n } from '../../domain/i18n/translation/l10n';

export class OpenAiProvider implements AiProvider {
  readonly label = 'OpenAI';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async complete(request: AiRequest): Promise<string> {
    if (!this.apiKey) {
      throw new AiConfigurationError(l10n.t('OpenAI API key not set. Run "Aura DataDock DB: Set AI Provider API Key".'));
    }
    if (!this.model) {
      throw new AiConfigurationError(l10n.t('Set the OpenAI model id in auraDataDockDb.ai.model.'));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', this.buildHttpRequest(request, this.apiKey));

    if (!response.ok) {
      throw new Error(l10n.t('OpenAI API error {0}: {1}', response.status, await response.text()));
    }

    const body = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
    return body.choices[0]?.message.content ?? '';
  }

  private buildHttpRequest(request: AiRequest, apiKey: string): RequestInit {
    return {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      }),
    };
  }
}
