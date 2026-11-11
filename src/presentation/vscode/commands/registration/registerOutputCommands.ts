import type * as vscode from 'vscode';
import type { TableNode } from '../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import type { SchemaCommandArgument } from '../model/SchemaCommandArgument';
import { copySelect } from '../schema/copySelect';
import { exportSchema } from '../schema/exportSchema';
import { showDiagram } from '../schema/showDiagram';
import { showTableDdl } from '../schema/showTableDdl';
import { exportTable } from '../table/export/exportTable';
import { registerCommand } from './registerCommand';

export function registerOutputCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand('exportTable', (node: TableNode) => exportTable(context, node)),
    registerCommand('showTableDdl', (node: TableNode) => showTableDdl(context, node)),
    registerCommand('copySelect', (node: TableNode) => copySelect(context, node)),
    registerCommand('showDiagram', (argument: SchemaCommandArgument) => showDiagram(context, argument)),
    registerCommand('exportSchema', (argument: SchemaCommandArgument) => exportSchema(context, argument)),
  ];
}
