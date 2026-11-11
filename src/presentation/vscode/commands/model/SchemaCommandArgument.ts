import { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { NamespaceNode } from '../../tree/nodes/schema/NamespaceNode';

export type SchemaCommandArgument = ConnectionNode | NamespaceNode | undefined;
