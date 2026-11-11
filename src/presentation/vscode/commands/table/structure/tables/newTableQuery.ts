import * as vscode from 'vscode';
import type { TableNode } from '../../../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { openBoundDocument } from '../../../query/editor/openBoundDocument';

export async function newTableQuery(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const adapter = await context.connections.getAdapter(target.id);
    const limit = context.config().get<number>('table.pageSize', 100);
    await openBoundDocument(context, target.key, `${adapter.buildSelectPreview(node.table, limit)}\n`);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
