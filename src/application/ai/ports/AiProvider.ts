export interface AiRequest {
  readonly system: string;
  readonly prompt: string;
  readonly signal?: AbortSignal;
}

export interface AiProvider {
  readonly label: string;
  complete(request: AiRequest): Promise<string>;
}
