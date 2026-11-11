import { renderDdl } from '../../../../application/schema/rendering/ddl/renderDdl';
import type { TableNode } from '../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import { openBoundDocument } from '../query/editor/openBoundDocument';
import { showError } from './showError';

export async function showTableDdl(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const schema = await context.schemas.get(target.id, node.table.namespace);
    await openBoundDocument(context, target.key, renderDdl(schema, { tableNames: [node.table.name] }));
  } catch (error) {
    showError(error);
  }
}
