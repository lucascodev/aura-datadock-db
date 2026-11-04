import type * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { cancelQuery } from '../connection/cancelQuery';
import type { DataDockContext } from '../model/DataDockContext';
import { newQuery } from '../query/editor/newQuery';
import { explainQuery } from '../query/run/explainQuery';
import { runFile } from '../query/run/runFile';
import { runQuery } from '../query/run/runQuery';
import { runStatementAt } from '../query/run/runStatementAt';
import { registerCommand } from './registerCommand';

export function registerQueryCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand('newQuery', (node?: ConnectionNode) => newQuery(context, node)),
    registerCommand('runQuery', () => runQuery(context)),
    registerCommand('runFile', () => runFile(context)),
    registerCommand('runStatementAt', (uri: vscode.Uri, offset: number, shouldExplain?: boolean) => runStatementAt(context, uri, offset, shouldExplain)),
    registerCommand('explainQuery', () => explainQuery(context)),
    registerCommand('cancelQuery', () => cancelQuery(context)),
  ];
}
