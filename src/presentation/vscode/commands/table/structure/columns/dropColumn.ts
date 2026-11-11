import { buildDropColumn } from '../../../../../../application/editing/structure/buildDropColumn';
import type { ColumnNode } from '../../../../tree/nodes/schema/ColumnNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { openReview } from '../shared/openReview';

export async function dropColumn(context: DataDockContext, node: ColumnNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildDropColumn(target.kind, node.table, node.column.name));
  }
}
