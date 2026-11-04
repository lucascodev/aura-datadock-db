import type * as vscode from 'vscode';
import type { ColumnNode } from '../../tree/nodes/ColumnNode';
import type { NamespaceNode } from '../../tree/nodes/NamespaceNode';
import type { TableNode } from '../../tree/nodes/TableNode';
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
    registerCommand('newTableQuery', (node: TableNode) => newTableQuery(context, node)),
    registerCommand('createTable', (node?: NamespaceNode) => createTable(context, node)),
    registerCommand('addColumn', (node: TableNode) => addColumn(context, node)),
    registerCommand('renameTable', (node: TableNode) => renameTable(context, node)),
    registerCommand('truncateTable', (node: TableNode) => truncateTable(context, node)),
    registerCommand('dropTable', (node: TableNode) => dropTable(context, node)),
    registerCommand('renameColumn', (node: ColumnNode) => renameColumn(context, node)),
    registerCommand('dropColumn', (node: ColumnNode) => dropColumn(context, node)),
    registerCommand('createIndex', (node: ColumnNode) => createIndex(context, node)),
  ];
}
