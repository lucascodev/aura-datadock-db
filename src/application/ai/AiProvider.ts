export interface AiRequest {
  readonly system: string;
  readonly prompt: string;
  readonly signal?: AbortSignal;
}

export interface AiProvider {
  readonly label: string;
  complete(request: AiRequest): Promise<string>;
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}
