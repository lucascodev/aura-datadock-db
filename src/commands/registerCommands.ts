import * as vscode from 'vscode';
import type { ContainerNode } from '../ui/tree/ContainerNode';
import type { TableNode } from '../ui/tree/TableNode';
import type { DataDockContext } from './DataDockContext';
import { generateSql } from './generateSql';
import { newQuery } from './newQuery';
import { openTable } from './openTable';
import { pickConnection } from './pickConnection';
import { runQuery } from './runQuery';
import { setAiApiKey } from './setAiApiKey';
import { setPassword } from './setPassword';

export function registerCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('auraDataDock.refresh', () => context.refresh()),
    vscode.commands.registerCommand('auraDataDock.selectConnection', () => pickConnection(context)),
    vscode.commands.registerCommand('auraDataDock.newQuery', (node?: ContainerNode) => newQuery(context, node)),
    vscode.commands.registerCommand('auraDataDock.runQuery', () => runQuery(context)),
    vscode.commands.registerCommand('auraDataDock.openTable', (node: TableNode) => openTable(context, node)),
    vscode.commands.registerCommand('auraDataDock.setPassword', (arg?: ContainerNode | string) => setPassword(context, arg)),
    vscode.commands.registerCommand('auraDataDock.generateSql', () => generateSql(context)),
    vscode.commands.registerCommand('auraDataDock.setAiApiKey', () => setAiApiKey(context)),
  ];
}
