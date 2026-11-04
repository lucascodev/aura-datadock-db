import type { ConnectionTarget } from '../model/ConnectionTarget';

export function isReachable(target: ConnectionTarget): boolean {
  return target.host !== undefined && target.port !== undefined;
}
