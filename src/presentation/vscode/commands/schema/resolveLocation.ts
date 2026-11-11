import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { DatabaseNode } from '../../tree/nodes/connection/DatabaseNode';
import { NamespaceNode } from '../../tree/nodes/schema/NamespaceNode';
import type { DataDockContext } from '../model/DataDockContext';
import { resolveConnection } from '../registry/resolveConnection';
import type { SchemaCommandArgument } from '../model/SchemaCommandArgument';

interface SchemaLocation {
  readonly target: ConnectionTarget;
  readonly namespace?: string;
}

export async function resolveLocation(context: DataDockContext, argument: SchemaCommandArgument): Promise<SchemaLocation | undefined> {
  if (argument instanceof NamespaceNode) {
    const target = context.connections.getTarget(argument.targetId);
    return target ? { target, namespace: argument.namespace } : undefined;
  }
  const target = argument instanceof ConnectionNode || argument instanceof DatabaseNode ? argument.target : await resolveConnection(context);
  return target ? { target } : undefined;
}
