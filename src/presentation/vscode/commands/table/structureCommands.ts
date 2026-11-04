import * as vscode from 'vscode';
import { buildAddColumn } from '../../../../application/editing/structure/buildAddColumn';
import { buildCreateIndex } from '../../../../application/editing/structure/buildCreateIndex';
import { buildCreateTable } from '../../../../application/editing/structure/buildCreateTable';
import { buildDropColumn } from '../../../../application/editing/structure/buildDropColumn';
import { buildDropTable } from '../../../../application/editing/structure/buildDropTable';
import { buildRenameColumn } from '../../../../application/editing/structure/buildRenameColumn';
import { buildRenameTable } from '../../../../application/editing/structure/buildRenameTable';
import { buildTruncateTable } from '../../../../application/editing/structure/buildTruncateTable';
import { chooseDefaultNamespace } from '../../../../application/schema/loading/chooseDefaultNamespace';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { getDriver } from '../../../../drivers/catalog/driverCatalog';
import type { ColumnNode } from '../../tree/nodes/ColumnNode';
import type { NamespaceNode } from '../../tree/nodes/NamespaceNode';
import type { TableNode } from '../../tree/nodes/TableNode';
import type { DataDockContext } from '../model/DataDockContext';
import { openBoundDocument } from '../query/newQuery';
import { l10n } from '../../../../domain/i18n/translation/l10n';


export async function createTable(context: DataDockContext, node?: NamespaceNode): Promise<void> {
  const target = node ? context.connections.getTarget(node.targetId) : context.connections.activeTarget;
  if (!target) {
    vscode.window.showWarningMessage(l10n.t('Select a connection first.'));
    return;
  }
  const namespace = node?.namespace ?? (await resolveDefaultNamespace(context, target));
  const name = namespace ? await askName(l10n.t('New table name')) : undefined;
  if (namespace && name) {
    await openReview(context, target, buildCreateTable(target.kind, { namespace, name }));
  }
}

export async function addColumn(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const name = target ? await askName(l10n.t('New column of {0}', node.table.name)) : undefined;
  if (!target || !name) {
    return;
  }
  const dataType = await askDataType(target);
  const allowNullLabel = l10n.t('Allow NULL');
  const nullability = dataType ? await vscode.window.showQuickPick([allowNullLabel, 'NOT NULL'], { placeHolder: l10n.t('Can {0} be NULL?', name) }) : undefined;
  if (dataType && nullability) {
    await openReview(context, target, buildAddColumn(target.kind, node.table, { name, dataType, isNullable: nullability === allowNullLabel }));
  }
}

export async function renameTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const newName = target ? await askName(l10n.t('Rename {0} to', node.table.name), node.table.name) : undefined;
  if (target && newName) {
    await openReview(context, target, buildRenameTable(target.kind, node.table, newName));
  }
}

export async function truncateTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildTruncateTable(target.kind, node.table));
  }
}

export async function dropTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildDropTable(target.kind, node.table, node.table.kind));
  }
}

export async function renameColumn(context: DataDockContext, node: ColumnNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const newName = target ? await askName(l10n.t('Rename {0} to', node.column.name), node.column.name) : undefined;
  if (target && newName) {
    await openReview(context, target, buildRenameColumn(target.kind, node.table, node.column.name, newName));
  }
}

export async function dropColumn(context: DataDockContext, node: ColumnNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildDropColumn(target.kind, node.table, node.column.name));
  }
}

export async function createIndex(context: DataDockContext, node: ColumnNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (target) {
    await openReview(context, target, buildCreateIndex(target.kind, node.table, node.column.name));
  }
}

export async function newTableQuery(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const adapter = await context.connections.getAdapter(target.id);
    const limit = context.config().get<number>('table.pageSize', 100);
    await openBoundDocument(context, target.key, `${adapter.buildSelectPreview(node.table, limit)}\n`);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

async function resolveDefaultNamespace(context: DataDockContext, target: ConnectionTarget): Promise<string | undefined> {
  try {
    const adapter = await context.connections.getAdapter(target.id);
    return chooseDefaultNamespace(target.kind, target.database, await adapter.listNamespaces());
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

async function askName(prompt: string, value?: string): Promise<string | undefined> {
  const name = await vscode.window.showInputBox({
    prompt,
    value,
    validateInput: (text) => (text.trim() ? undefined : l10n.t('Enter a name.')),
  });
  return name?.trim();
}

async function askDataType(target: ConnectionTarget): Promise<string | undefined> {
  const otherTypeLabel = l10n.t('Other…');
  const picked = await vscode.window.showQuickPick([...getDriver(target.kind).dialect.commonTypes, otherTypeLabel], { placeHolder: l10n.t('Column type') });
  if (picked !== otherTypeLabel) {
    return picked;
  }
  return vscode.window.showInputBox({ prompt: l10n.t('Column type'), validateInput: (text) => (text.trim() ? undefined : l10n.t('Enter a type.')) });
}

async function openReview(context: DataDockContext, target: ConnectionTarget, sql: string): Promise<void> {
  await openBoundDocument(context, target.key, `-- ${l10n.t('Review this statement and run it with Ctrl+Enter')}\n${sql}\n`);
}
