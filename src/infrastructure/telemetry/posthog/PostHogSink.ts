import type { UsageSink } from '../../../application/telemetry/ports/UsageSink';

const CAPTURE_PATH = '/i/v0/e/';
const REQUEST_TIMEOUT_MS = 10_000;

interface PostHogSinkOptions {
  readonly host: string;
  readonly projectKey: string;
  readonly distinctId: string;
}

export class PostHogSink implements UsageSink {
  constructor(private readonly options: PostHogSinkOptions) {}

  send(eventName: string, properties: Readonly<Record<string, unknown>>): void {
    const { host, projectKey, distinctId } = this.options;
    const body = JSON.stringify({
      api_key: projectKey,
      event: eventName,
      distinct_id: distinctId,
      timestamp: new Date().toISOString(),
      properties: { ...properties, $process_person_profile: false },
    });
    fetch(new URL(CAPTURE_PATH, host), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => undefined);
  }
}
