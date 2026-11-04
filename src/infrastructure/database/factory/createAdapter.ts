import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import { ADAPTER_FACTORIES } from '../constants/adapterFactories';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function createAdapter(target: ConnectionTarget): DatabaseAdapter {
  const factory = ADAPTER_FACTORIES[target.kind];
  if (!factory) {
    throw new Error(l10n.t('No adapter registered for the database driver: {0}', target.kind));
  }
  return factory(target);
}
