import { buildTruncateTable } from '../../../../../../application/editing/structure/buildTruncateTable';
import type { TableNode } from '../../../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { openReview } from '../shared/openReview';

export async function truncateTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildTruncateTable(target.kind, node.table));
  }
}
