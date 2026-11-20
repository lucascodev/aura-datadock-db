export interface UsageSink {
  send(eventName: string, properties: Readonly<Record<string, unknown>>): void;
}
