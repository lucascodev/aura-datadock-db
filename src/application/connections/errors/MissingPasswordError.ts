import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import { l10n } from '../../../domain/i18n/translation/l10n';

export class MissingPasswordError extends Error {
  constructor(readonly target: ConnectionTarget) {
    super(l10n.t('No password found for {0}. Use "Aura DataDock DB: Set Password".', target.name));
    this.name = 'MissingPasswordError';
  }
}
