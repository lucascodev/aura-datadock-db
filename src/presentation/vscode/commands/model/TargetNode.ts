import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import type { DatabaseNode } from '../../tree/nodes/connection/DatabaseNode';

export type TargetNode = ConnectionNode | DatabaseNode;
