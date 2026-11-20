import type * as vscode from 'vscode';
import type { ColumnNode } from '../../tree/nodes/schema/ColumnNode';
import type { NamespaceNode } from '../../tree/nodes/schema/NamespaceNode';
import type { TableNode } from '../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import { addColumn } from '../table/structure/columns/addColumn';
import { createIndex } from '../table/structure/columns/createIndex';
import { dropColumn } from '../table/structure/columns/dropColumn';
import { renameColumn } from '../table/structure/columns/renameColumn';
import { createTable } from '../table/structure/tables/createTable';
import { dropTable } from '../table/structure/tables/dropTable';
import { newTableQuery } from '../table/structure/tables/newTableQuery';
import { renameTable } from '../table/structure/tables/renameTable';
import { truncateTable } from '../table/structure/tables/truncateTable';
import { registerCommand } from './registerCommand';

export function registerStructureCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand(context.usage, 'newTableQuery', (node: TableNode) => newTableQuery(context, node)),
    registerCommand(context.usage, 'createTable', (node?: NamespaceNode) => createTable(context, node)),
    registerCommand(context.usage, 'addColumn', (node: TableNode) => addColumn(context, node)),
    registerCommand(context.usage, 'renameTable', (node: TableNode) => renameTable(context, node)),
    registerCommand(context.usage, 'truncateTable', (node: TableNode) => truncateTable(context, node)),
    registerCommand(context.usage, 'dropTable', (node: TableNode) => dropTable(context, node)),
    registerCommand(context.usage, 'renameColumn', (node: ColumnNode) => renameColumn(context, node)),
    registerCommand(context.usage, 'dropColumn', (node: ColumnNode) => dropColumn(context, node)),
    registerCommand(context.usage, 'createIndex', (node: ColumnNode) => createIndex(context, node)),
  ];
}
