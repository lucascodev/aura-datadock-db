import * as vscode from 'vscode';
import { resolveProtectionSetting } from '../../../application/settings/resolveProtectionSetting';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { openBoundDocument } from '../../../presentation/vscode/commands/query/editor/openBoundDocument';
import { executeQuery } from '../../../presentation/vscode/commands/query/run/executeQuery';
import { exportRows } from '../../../presentation/vscode/commands/table/export/exportRows';
import { openTableOf } from '../../../presentation/vscode/commands/table/open/openTableOf';
import { TableEditors } from '../../../presentation/vscode/panels/table/TableEditors';
import type { ConnectionServices } from '../model/ConnectionServices';
import type { HostEnvironment } from '../model/HostEnvironment';
import type { WorkspaceServices } from '../model/WorkspaceServices';

export function createTableEditors(
  host: HostEnvironment,
  connection: ConnectionServices,
  workspace: WorkspaceServices,
  getContext: () => DataDockContext,
): TableEditors {
  const { config, output } = host;
  return new TableEditors({
    extensionUri: host.extension.extensionUri,
    getAdapter: (targetId) => connection.manager.getAdapter(targetId),
    loadSchema: (target, namespace) => workspace.schemas.get(target.id, namespace),
    isReadOnly: (target) => resolveProtectionSetting(config().inspect<boolean>('readOnly'), false) || target.isReadOnly,
    confirmsDestructive: () => resolveProtectionSetting(config().inspect<boolean>('confirmDestructiveQueries'), true),
    pageSize: () => config().get<number>('table.pageSize', 100),
    openSql: (target, sql) => openBoundDocument(getContext(), target.key, sql),
    runScript: (target, sql) => executeQuery(getContext(), target, sql),
    runChart: (target, sql) => executeQuery(getContext(), target, sql, true),
    exportRows: (target, table, statement) => exportRows(getContext(), target, table, statement),
    openTable: (target, table) => openTableOf(getContext(), target, table),
    copyText: (text) => vscode.env.clipboard.writeText(text),
    recordHistory: (entry) => workspace.history.add(entry),
    log: (message) => output.warn(message),
  });
}
