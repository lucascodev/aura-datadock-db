import { AiConfigurationError, type AiProvider, type AiRequest } from './AiProvider';

export class OpenAiProvider implements AiProvider {
  readonly label = 'OpenAI';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async complete(request: AiRequest): Promise<string> {
    if (!this.apiKey) {
      throw new AiConfigurationError('OpenAI API key not set. Run "Aura DataDock: Set AI Provider API Key".');
    }
    if (!this.model) {
      throw new AiConfigurationError('Set the OpenAI model id in auraDataDock.ai.model.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
    return body.choices[0]?.message.content ?? '';
  }
}
