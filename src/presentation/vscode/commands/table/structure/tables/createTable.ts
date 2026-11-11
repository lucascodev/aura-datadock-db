import * as vscode from 'vscode';
import { buildCreateTable } from '../../../../../../application/editing/structure/buildCreateTable';
import { chooseDefaultNamespace } from '../../../../../../application/schema/loading/chooseDefaultNamespace';
import type { ConnectionTarget } from '../../../../../../domain/connection/model/ConnectionTarget';
import type { NamespaceNode } from '../../../../tree/nodes/schema/NamespaceNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { askName } from '../shared/askName';
import { openReview } from '../shared/openReview';

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

async function resolveDefaultNamespace(context: DataDockContext, target: ConnectionTarget): Promise<string | undefined> {
  try {
    const adapter = await context.connections.getAdapter(target.id);
    return chooseDefaultNamespace(target.kind, target.database, await adapter.listNamespaces());
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}
