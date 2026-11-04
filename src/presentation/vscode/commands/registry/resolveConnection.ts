import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';
import { pickConnection } from './pickConnection';

export async function resolveConnection(context: DataDockContext): Promise<ConnectionTarget | undefined> {
  return context.connections.activeTarget ?? pickConnection(context);
}
