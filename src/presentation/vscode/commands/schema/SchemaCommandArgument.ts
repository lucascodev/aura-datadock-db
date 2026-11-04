import { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { NamespaceNode } from '../../tree/nodes/NamespaceNode';

export type SchemaCommandArgument = ConnectionNode | NamespaceNode | undefined;
