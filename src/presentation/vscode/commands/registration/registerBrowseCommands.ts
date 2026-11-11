import type * as vscode from 'vscode';
import type { TableNode } from '../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import { filterSchema } from '../schema/filterSchema';
import { openTable } from '../table/open/openTable';
import { registerCommand } from './registerCommand';

export function registerBrowseCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand('activateConnection', (targetId: string) => context.connections.setActive(targetId)),
    registerCommand('filterSchema', () => filterSchema(context)),
    registerCommand('openTable', (node: TableNode) => openTable(context, node)),
    registerCommand('addRow', (node: TableNode) => openTable(context, node, true)),
  ];
}
