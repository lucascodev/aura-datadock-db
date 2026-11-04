import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import type { DriverId } from '../../domain/driver/model/DriverId';
import { l10n } from '../../domain/i18n/translation/l10n';
import { findDriver } from './findDriver';

export function getDriver(id: DriverId): DriverDescriptor {
  const driver = findDriver(id);
  if (!driver) {
    throw new Error(l10n.t('Unknown database driver: {0}', id));
  }
  return driver;
}
