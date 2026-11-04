import type { DriverId } from '../../../domain/driver/DriverId';
import type { ResolvedCredentials } from '../../../domain/connection/ResolvedCredentials';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import { l10n } from '../../../domain/i18n/l10n';

export function parseEnv(entries: readonly string[] = []): Record<string, string> {
  const env: Record<string, string> = {};
  for (const entry of entries) {
    const index = entry.indexOf('=');
    if (index > 0) {
      env[entry.slice(0, index)] = entry.slice(index + 1);
    }
  }
  return env;
}

export function resolveCredentials(kind: DriverId, env: Record<string, string>): ResolvedCredentials {
  const docker = getDriver(kind).docker;
  if (!docker) {
    throw new Error(l10n.t('The driver {0} does not support Docker discovery', kind));
  }
  return docker.resolveCredentials(env);
}
