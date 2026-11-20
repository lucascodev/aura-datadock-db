import type * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { addConnection } from '../connection/addConnection';
import { disconnect } from '../connection/disconnect';
import { editConnection } from '../connection/editConnection';
import { removeConnection } from '../connection/removeConnection';
import { selectConnection } from '../connection/selectConnection';
import type { DataDockContext } from '../model/DataDockContext';
import { registerCommand } from './registerCommand';

export function registerConnectionCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand(context.usage, 'refresh', () => {
      context.schemas.invalidate();
      return context.refresh();
    }),
    registerCommand(context.usage, 'addConnection', () => addConnection(context)),
    registerCommand(context.usage, 'editConnection', (node: ConnectionNode) => editConnection(context, node)),
    registerCommand(context.usage, 'removeConnection', (node: ConnectionNode) => removeConnection(context, node)),
    registerCommand(context.usage, 'disconnect', (node: ConnectionNode) => disconnect(context, node)),
    registerCommand(context.usage, 'selectConnection', () => selectConnection(context)),
  ];
}
