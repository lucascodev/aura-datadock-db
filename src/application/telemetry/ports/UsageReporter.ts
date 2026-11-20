import type { UsageEvent } from '../model/UsageEvent';

export interface UsageReporter {
  report(event: UsageEvent): void;
}
