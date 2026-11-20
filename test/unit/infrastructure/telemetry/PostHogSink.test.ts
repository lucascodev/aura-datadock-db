import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostHogSink } from '../../../../src/infrastructure/telemetry/posthog/PostHogSink';

const options = { host: 'https://eu.i.posthog.com', projectKey: 'phc_test', distinctId: 'machine-1' };

function stubFetch(result: Promise<unknown>) {
  const fetchMock = vi.fn((_url: URL, _init: RequestInit) => result);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PostHogSink', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the event to the capture endpoint of the host', () => {
    const fetchMock = stubFetch(Promise.resolve({ ok: true }));

    new PostHogSink(options).send('command.used', { command: 'runQuery' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe('https://eu.i.posthog.com/i/v0/e/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      api_key: 'phc_test',
      event: 'command.used',
      distinct_id: 'machine-1',
      properties: { command: 'runQuery', $process_person_profile: false },
    });
  });

  it('does not throw when the request fails', async () => {
    stubFetch(Promise.reject(new Error('offline')));

    expect(() => new PostHogSink(options).send('activated', {})).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
