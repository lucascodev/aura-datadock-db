import * as vscode from 'vscode';
import type { ConnectionNode } from '../../tree/nodes/connection/ConnectionNode';
import { type DataDockContext } from '../model/DataDockContext';
import { passwordSecretName } from '../registry/passwordSecretName';
import { pickConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function setPassword(context: DataDockContext, arg?: ConnectionNode | string): Promise<void> {
  const target =
    typeof arg === 'string'
      ? context.connections.getTarget(arg)
      : (arg?.target ?? (await pickConnection(context)));
  if (!target) {
    return;
  }

  const password = await vscode.window.showInputBox({
    title: l10n.t('Password for {0}@{1}', target.user, target.name),
    prompt: l10n.t('Stored in the operating system keychain through VS Code SecretStorage.'),
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) {
    return;
  }

  await context.secrets.store(passwordSecretName(target), password);
  await context.connections.close(target.id);
  await context.refresh();
}
