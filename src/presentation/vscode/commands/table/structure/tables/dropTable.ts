import { buildDropTable } from '../../../../../../application/editing/structure/buildDropTable';
import type { TableNode } from '../../../../tree/nodes/TableNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { openReview } from '../shared/openReview';

export async function dropTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildDropTable(target.kind, node.table, node.table.kind));
  }
}
