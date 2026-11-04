import type * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { addConnection } from '../connection/addConnection';
import { disconnect } from '../connection/disconnect';
import { editConnection } from '../connection/editConnection';
import { removeConnection } from '../connection/removeConnection';
import { selectConnection } from '../connection/selectConnection';
import type { DataDockContext } from '../model/DataDockContext';
import { registerCommand } from './registerCommand';

export function registerConnectionCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand('refresh', () => {
      context.schemas.invalidate();
      return context.refresh();
    }),
    registerCommand('addConnection', () => addConnection(context)),
    registerCommand('editConnection', (node: ConnectionNode) => editConnection(context, node)),
    registerCommand('removeConnection', (node: ConnectionNode) => removeConnection(context, node)),
    registerCommand('disconnect', (node: ConnectionNode) => disconnect(context, node)),
    registerCommand('selectConnection', () => selectConnection(context)),
  ];
}
