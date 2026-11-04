import * as vscode from 'vscode';
import { l10n } from '../../../domain/i18n/translation/l10n';
import { savedPasswordSecretName } from '../../../presentation/vscode/commands/registry/savedPasswordSecretName';
import { ConnectionFormPanel } from '../../../presentation/vscode/panels/connection/ConnectionFormPanel';
import type { ContextInput } from '../model/ContextInput';

const SAVED_MESSAGE_DURATION_MS = 3000;

export function createConnectionForm(input: ContextInput): ConnectionFormPanel {
  const { extension } = input.host;
  const { manager, savedConnections } = input.connection;
  return new ConnectionFormPanel({
    extensionUri: extension.extensionUri,
    saved: savedConnections,
    openAdapter: input.openAdapter,
    readPassword: (connectionId) => extension.secrets.get(savedPasswordSecretName(connectionId)),
    storePassword: (connectionId, password) => extension.secrets.store(savedPasswordSecretName(connectionId), password),
    onSaved: async (connection) => {
      await manager.close(connection.id);
      input.workspace.schemas.invalidate(connection.id);
      await input.refresh();
      vscode.window.setStatusBarMessage(l10n.t('Saved connection {0}', connection.name), SAVED_MESSAGE_DURATION_MS);
    },
  });
}
