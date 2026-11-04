import * as vscode from 'vscode';
import { chooseDefaultNamespace } from '../../../../application/schema/loading/chooseDefaultNamespace';
import { renderDdl } from '../../../../application/schema/rendering/renderDdl';
import type { SchemaExportFormatId } from '../../../../application/schema/rendering/SchemaExportFormat';
import { SCHEMA_EXPORT_FORMATS } from '../../../../application/schema/rendering/schemaExportFormats';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import { ConnectionNode } from '../../tree/nodes/ConnectionNode';
import { NamespaceNode } from '../../tree/nodes/NamespaceNode';
import type { TableNode } from '../../tree/nodes/TableNode';
import type { DataDockContext } from '../registry/DataDockContext';
import { openBoundDocument } from '../query/newQuery';
import { resolveConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { SchemaCommandArgument } from './SchemaCommandArgument';

interface SchemaLocation {
  readonly target: ConnectionTarget;
  readonly namespace?: string;
}

export async function showDiagram(context: DataDockContext, argument: SchemaCommandArgument): Promise<void> {
  const location = await resolveLocation(context, argument);
  if (location) {
    await context.diagrams.show(location.target, location.namespace);
  }
}

export async function exportSchema(context: DataDockContext, argument: SchemaCommandArgument): Promise<void> {
  const location = await resolveLocation(context, argument);
  if (!location) {
    return;
  }
  try {
    const namespace = location.namespace ?? (await chooseNamespace(context, location.target));
    if (!namespace) {
      return;
    }
    const picked = await vscode.window.showQuickPick(
      SCHEMA_EXPORT_FORMATS.map((format) => ({ label: format.label(), description: `.${format.extension}`, id: format.id })),
      { placeHolder: l10n.t('Export {0} as', namespace) },
    );
    if (picked) {
      await saveSchemaExport(await context.schemas.get(location.target.id, namespace), picked.id);
    }
  } catch (error) {
    showError(error);
  }
}

export async function saveSchemaExport(schema: NamespaceSchema, formatId: SchemaExportFormatId): Promise<void> {
  const format = SCHEMA_EXPORT_FORMATS.find((candidate) => candidate.id === formatId);
  if (!format) {
    return;
  }
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${schema.namespace}.${format.extension}`),
    filters: { [format.label()]: [format.extension] },
  });
  if (uri) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(format.render(schema), 'utf8'));
    vscode.window.setStatusBarMessage(l10n.t('Saved schema to {0}', uri.fsPath), 3000);
  }
}

export async function showTableDdl(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const schema = await context.schemas.get(target.id, node.table.namespace);
    await openBoundDocument(context, target.key, renderDdl(schema, { tableNames: [node.table.name] }));
  } catch (error) {
    showError(error);
  }
}

export async function copySelect(context: DataDockContext, node: TableNode): Promise<void> {
  try {
    const adapter = await context.connections.getAdapter(node.targetId);
    const sql = adapter.buildSelectPreview(node.table, context.config().get<number>('maxRows', 500));
    await vscode.env.clipboard.writeText(sql);
    vscode.window.setStatusBarMessage(l10n.t('SELECT copied to the clipboard'), 3000);
  } catch (error) {
    showError(error);
  }
}

async function resolveLocation(context: DataDockContext, argument: SchemaCommandArgument): Promise<SchemaLocation | undefined> {
  if (argument instanceof NamespaceNode) {
    const target = context.connections.getTarget(argument.targetId);
    return target ? { target, namespace: argument.namespace } : undefined;
  }
  const target = argument instanceof ConnectionNode ? argument.target : await resolveConnection(context);
  return target ? { target } : undefined;
}

async function chooseNamespace(context: DataDockContext, target: ConnectionTarget): Promise<string | undefined> {
  const adapter = await context.connections.getAdapter(target.id);
  const namespaces = await adapter.listNamespaces();
  if (namespaces.length <= 1) {
    return namespaces[0];
  }
  const fallback = chooseDefaultNamespace(target.kind, target.database, namespaces);
  const ordered = [...namespaces].sort((left, right) => Number(right === fallback) - Number(left === fallback));
  return vscode.window.showQuickPick(ordered, { placeHolder: l10n.t('Choose the schema') });
}

function showError(error: unknown): void {
  vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
}
