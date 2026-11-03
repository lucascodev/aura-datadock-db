import * as vscode from 'vscode';
import type { TableNode } from '../ui/tree/TableNode';
import type { DataDockContext } from './DataDockContext';
import { executeQuery } from './executeQuery';

export async function openTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const adapter = await context.connections.getAdapter(target.id);
    const sql = adapter.buildSelectPreview(node.table, context.config().get<number>('maxRows', 500));
    await executeQuery(context, target, sql);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
