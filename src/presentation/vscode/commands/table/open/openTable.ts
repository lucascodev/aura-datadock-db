import type { TableNode } from '../../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../../model/DataDockContext';
import { openTableOf } from './openTableOf';

export async function openTable(context: DataDockContext, node: TableNode, shouldAddRow = false): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openTableOf(context, target, node.table, shouldAddRow);
  }
}
