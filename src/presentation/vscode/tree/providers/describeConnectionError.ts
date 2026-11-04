import { MissingPasswordError } from '../../../../application/connections/errors/MissingPasswordError';
import { MessageNode } from '../nodes/MessageNode';
import { l10n } from '../../../../domain/i18n/l10n';

export function toErrorNode(error: unknown): MessageNode {
  if (error instanceof MissingPasswordError) {
    return new MessageNode(l10n.t('Password needed, click to set it'), 'key', {
      command: 'auraDataDockDb.setPassword',
      title: l10n.t('Set Password'),
      arguments: [error.target.id],
    });
  }
  return new MessageNode(error instanceof Error ? error.message : String(error), 'error');
}
