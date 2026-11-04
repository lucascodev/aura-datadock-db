import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ResolvedCredentials } from '../../../domain/connection/model/ResolvedCredentials';
import { getDriver } from '../../../drivers/catalog/getDriver';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function resolveCredentials(kind: DriverId, env: Record<string, string>): ResolvedCredentials {
  const docker = getDriver(kind).docker;
  if (!docker) {
    throw new Error(l10n.t('The driver {0} does not support Docker discovery', kind));
  }
  return docker.resolveCredentials(env);
}
