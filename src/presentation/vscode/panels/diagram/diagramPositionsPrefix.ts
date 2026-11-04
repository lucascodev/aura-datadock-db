import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';

export function diagramPositionsPrefix(target: Pick<ConnectionTarget, 'key'>): string {
  return `auraDataDockDb.diagram.${target.key}.`;
}
