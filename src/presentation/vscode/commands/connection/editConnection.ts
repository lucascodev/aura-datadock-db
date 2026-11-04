import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import type { DataDockContext } from '../model/DataDockContext';

export function editConnection(context: DataDockContext, node: ConnectionNode): void {
  const connection = context.savedConnections.find(node.target.id);
  if (connection) {
    context.connectionForm.open(connection);
  }
}
