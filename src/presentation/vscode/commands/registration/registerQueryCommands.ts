import type * as vscode from 'vscode';
import type { TargetNode } from '../model/TargetNode';
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
    registerCommand(context.usage, 'newQuery', (node?: TargetNode) => newQuery(context, node)),
    registerCommand(context.usage, 'runQuery', () => runQuery(context)),
    registerCommand(context.usage, 'runFile', () => runFile(context)),
    registerCommand(context.usage, 'runStatementAt', (uri: vscode.Uri, offset: number, shouldExplain?: boolean) => runStatementAt(context, uri, offset, shouldExplain)),
    registerCommand(context.usage, 'explainQuery', () => explainQuery(context)),
    registerCommand(context.usage, 'cancelQuery', () => cancelQuery(context)),
  ];
}
