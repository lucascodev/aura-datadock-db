import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import type { DriverId } from '../../domain/driver/model/DriverId';
import { DRIVER_DESCRIPTORS } from './driverDescriptors';
import { l10n } from '../../domain/i18n/translation/l10n';

export function listDrivers(): readonly DriverDescriptor[] {
  return DRIVER_DESCRIPTORS;
}

export function findDriver(id: DriverId): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.id === id);
}

export function getDriver(id: DriverId): DriverDescriptor {
  const driver = findDriver(id);
  if (!driver) {
    throw new Error(l10n.t('Unknown database driver: {0}', id));
  }
  return driver;
}

export function findDriverByScheme(scheme: string): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.connectionSchemes.includes(scheme));
}

export function findDriverByImage(image: string): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.docker?.imagePatterns.some((pattern) => pattern.test(image)));
}
