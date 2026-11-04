import type { ConnectionTarget } from '../../../domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/DatabaseAdapter';
import { ADAPTER_FACTORIES } from './adapterFactories';
import { l10n } from '../../../domain/i18n/l10n';

export function createAdapter(target: ConnectionTarget): DatabaseAdapter {
  const factory = ADAPTER_FACTORIES[target.kind];
  if (!factory) {
    throw new Error(l10n.t('No adapter registered for the database driver: {0}', target.kind));
  }
  return factory(target);
}
