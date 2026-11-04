import * as vscode from 'vscode';
import type { QueryHistoryEntry } from '../../../../application/query/history/QueryHistoryEntry';
import type { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import type { ColumnNode } from '../../tree/nodes/ColumnNode';
import type { NamespaceNode } from '../../tree/nodes/NamespaceNode';
import type { TableNode } from '../../tree/nodes/TableNode';
import { addConnection, disconnect, editConnection, removeConnection } from '../connection/connectionCommands';
import type { DataDockContext } from './DataDockContext';
import { exportTable } from '../table/exportTable';
import { generateSql } from '../ai/generateSql';
import { clearHistory, openHistoryEntry } from '../query/historyCommands';
import { newQuery } from '../query/newQuery';
import { openTable } from '../table/openTable';
import { explainQuery, runFile, runQuery, runStatementAt } from '../query/runQuery';
import { copySelect, exportSchema, showDiagram, showTableDdl, type SchemaCommandArgument } from '../schema/schemaCommands';
import { cancelQuery, selectConnection } from '../connection/selectConnection';
import { setAiApiKey } from '../ai/setAiApiKey';
import { filterSchema } from '../schema/filterSchema';
import { setPassword } from '../connection/setPassword';
import { addColumn, createIndex, createTable, dropColumn, dropTable, newTableQuery, renameColumn, renameTable, truncateTable } from '../table/structureCommands';

export function registerCommands(context: DataDockContext): vscode.Disposable[] {
  const register = <Args extends unknown[]>(id: string, handler: (...args: Args) => unknown) =>
    vscode.commands.registerCommand(`auraDataDockDb.${id}`, handler);

  return [
    register('refresh', () => {
      context.schemas.invalidate();
      return context.refresh();
    }),
    register('addConnection', () => addConnection(context)),
    register('editConnection', (node: ConnectionNode) => editConnection(context, node)),
    register('removeConnection', (node: ConnectionNode) => removeConnection(context, node)),
    register('disconnect', (node: ConnectionNode) => disconnect(context, node)),
    register('selectConnection', () => selectConnection(context)),
    register('newQuery', (node?: ConnectionNode) => newQuery(context, node)),
    register('runQuery', () => runQuery(context)),
    register('runFile', () => runFile(context)),
    register('runStatementAt', (uri: vscode.Uri, offset: number, shouldExplain?: boolean) => runStatementAt(context, uri, offset, shouldExplain)),
    register('explainQuery', () => explainQuery(context)),
    register('cancelQuery', () => cancelQuery(context)),
    register('activateConnection', (targetId: string) => context.connections.setActive(targetId)),
    register('filterSchema', () => filterSchema(context)),
    register('openTable', (node: TableNode) => openTable(context, node)),
    register('addRow', (node: TableNode) => openTable(context, node, true)),
    register('newTableQuery', (node: TableNode) => newTableQuery(context, node)),
    register('createTable', (node?: NamespaceNode) => createTable(context, node)),
    register('addColumn', (node: TableNode) => addColumn(context, node)),
    register('renameTable', (node: TableNode) => renameTable(context, node)),
    register('truncateTable', (node: TableNode) => truncateTable(context, node)),
    register('dropTable', (node: TableNode) => dropTable(context, node)),
    register('renameColumn', (node: ColumnNode) => renameColumn(context, node)),
    register('dropColumn', (node: ColumnNode) => dropColumn(context, node)),
    register('createIndex', (node: ColumnNode) => createIndex(context, node)),
    register('exportTable', (node: TableNode) => exportTable(context, node)),
    register('showTableDdl', (node: TableNode) => showTableDdl(context, node)),
    register('copySelect', (node: TableNode) => copySelect(context, node)),
    register('showDiagram', (argument: SchemaCommandArgument) => showDiagram(context, argument)),
    register('exportSchema', (argument: SchemaCommandArgument) => exportSchema(context, argument)),
    register('openHistoryEntry', (entry: QueryHistoryEntry) => openHistoryEntry(context, entry)),
    register('clearHistory', () => clearHistory(context)),
    register('setPassword', (argument?: ConnectionNode | string) => setPassword(context, argument)),
    register('generateSql', () => generateSql(context)),
    register('setAiApiKey', () => setAiApiKey(context)),
  ];
}
