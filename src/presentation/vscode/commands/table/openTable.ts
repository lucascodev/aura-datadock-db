import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import type { TableNode } from '../../tree/nodes/TableNode';
import type { DataDockContext } from '../registry/DataDockContext';

export async function openTable(context: DataDockContext, node: TableNode, shouldAddRow = false): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openTableOf(context, target, node.table, shouldAddRow);
  }
}

export async function openTableOf(context: DataDockContext, target: ConnectionTarget, table: Pick<TableRef, 'namespace' | 'name'>, shouldAddRow = false): Promise<void> {
  try {
    await context.tableEditors.show(target, table, { shouldAddRow });
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
