import type * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { generateSql } from '../ai/generateSql';
import { setAiApiKey } from '../ai/setAiApiKey';
import { setPassword } from '../connection/setPassword';
import type { DataDockContext } from '../model/DataDockContext';
import { registerCommand } from './registerCommand';

export function registerAiCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand('setPassword', (argument?: ConnectionNode | string) => setPassword(context, argument)),
    registerCommand('generateSql', () => generateSql(context)),
    registerCommand('setAiApiKey', () => setAiApiKey(context)),
  ];
}
