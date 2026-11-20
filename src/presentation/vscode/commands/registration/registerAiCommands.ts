import type * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { generateSql } from '../ai/generateSql';
import { setAiApiKey } from '../ai/setAiApiKey';
import { setPassword } from '../connection/setPassword';
import type { DataDockContext } from '../model/DataDockContext';
import { registerCommand } from './registerCommand';

export function registerAiCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand(context.usage, 'setPassword', (argument?: ConnectionNode | string) => setPassword(context, argument)),
    registerCommand(context.usage, 'generateSql', () => generateSql(context)),
    registerCommand(context.usage, 'setAiApiKey', () => setAiApiKey(context)),
  ];
}
