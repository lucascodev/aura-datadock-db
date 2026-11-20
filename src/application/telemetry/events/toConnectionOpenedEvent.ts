import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { UsageEvent } from '../model/UsageEvent';

type ConnectionOpenedEvent = Extract<UsageEvent, { name: 'connection.opened' }>;

export function toConnectionOpenedEvent(target: ConnectionTarget): ConnectionOpenedEvent {
  return {
    name: 'connection.opened',
    driver: target.kind,
    source: target.source,
    ssh: target.ssh !== undefined,
    remote: target.isRemote,
  };
}
