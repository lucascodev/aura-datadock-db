import * as vscode from 'vscode';
import type { ContainerNode } from '../ui/tree/ContainerNode';
import { passwordSecretName, type DataDockContext } from './DataDockContext';
import { pickConnection } from './pickConnection';

export async function setPassword(context: DataDockContext, arg?: ContainerNode | string): Promise<void> {
  const target =
    typeof arg === 'string'
      ? context.connections.getTarget(arg)
      : (arg?.target ?? (await pickConnection(context)));
  if (!target) {
    return;
  }

  const password = await vscode.window.showInputBox({
    title: `Password for ${target.user}@${target.containerName}`,
    prompt: 'Stored in the operating system keychain through VS Code SecretStorage.',
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) {
    return;
  }

  await context.secrets.store(passwordSecretName(target.containerName), password);
  await context.connections.close(target.id);
  await context.refresh();
}
