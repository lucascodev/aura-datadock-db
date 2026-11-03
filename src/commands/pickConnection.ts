import * as vscode from 'vscode';
import { isReachable, type ConnectionTarget } from '../domain/ConnectionTarget';
import type { DataDockContext } from './DataDockContext';

export async function resolveConnection(context: DataDockContext): Promise<ConnectionTarget | undefined> {
  return context.connections.activeTarget ?? pickConnection(context);
}

export async function pickConnection(context: DataDockContext): Promise<ConnectionTarget | undefined> {
  const targets = context.connections.getTargets().filter(isReachable);
  if (targets.length === 0) {
    vscode.window.showWarningMessage('No reachable database containers found. Start one with a published port and refresh.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    targets.map((target) => ({
      label: target.containerName,
      description: `${target.kind} · ${target.host}:${target.port}`,
      detail: target.image,
      target,
    })),
    { placeHolder: 'Choose the database container' },
  );
  if (picked) {
    context.connections.setActive(picked.target.id);
  }
  return picked?.target;
}
