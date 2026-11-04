import * as vscode from 'vscode';
import { type ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { isReachable } from '../../../../domain/connection/rules/isReachable';
import type { DataDockContext } from './DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function resolveConnection(context: DataDockContext): Promise<ConnectionTarget | undefined> {
  return context.connections.activeTarget ?? pickConnection(context);
}

export function findDocumentConnection(context: DataDockContext, document: vscode.TextDocument): ConnectionTarget | undefined {
  const boundKey = context.bindings.get(document.uri.toString());
  return boundKey ? context.connections.findByKey(boundKey) : context.connections.activeTarget;
}

export async function resolveDocumentConnection(context: DataDockContext, document: vscode.TextDocument): Promise<ConnectionTarget | undefined> {
  const uri = document.uri.toString();
  const boundKey = context.bindings.get(uri);
  const target = findDocumentConnection(context, document);

  if (boundKey && !target) {
    vscode.window.showWarningMessage(l10n.t('The database of this file is not available. Choose another one.'));
    return pickDocumentConnection(context, document);
  }
  if (!target) {
    return pickDocumentConnection(context, document);
  }
  context.bindings.bind(uri, target.key);
  return target;
}

export async function pickDocumentConnection(context: DataDockContext, document: vscode.TextDocument): Promise<ConnectionTarget | undefined> {
  const picked = await pickConnection(context);
  if (picked) {
    context.bindings.bind(document.uri.toString(), picked.key);
  }
  return picked;
}

export async function pickConnection(context: DataDockContext): Promise<ConnectionTarget | undefined> {
  const targets = context.connections.getTargets().filter(isReachable);
  if (targets.length === 0) {
    const addConnection = l10n.t('Add New Connection');
    const answer = await vscode.window.showWarningMessage(l10n.t('No connections found. Add one, or start a database container with a published port.'), addConnection);
    if (answer === addConnection) {
      await vscode.commands.executeCommand('auraDataDockDb.addConnection');
    }
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    targets.map((target) => ({
      label: target.name,
      description: `${target.kind} · ${target.host}:${target.port}${target.isRemote ? ` · ${l10n.t('remote')}` : ''}`,
      detail: target.detail,
      target,
    })),
    { placeHolder: l10n.t('Choose the database') },
  );
  if (picked) {
    context.connections.setActive(picked.target.id);
  }
  return picked?.target;
}
