import { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { DatabaseNode } from '../../tree/nodes/connection/DatabaseNode';
import { NamespaceNode } from '../../tree/nodes/schema/NamespaceNode';

export type SchemaCommandArgument = ConnectionNode | DatabaseNode | NamespaceNode | undefined;
