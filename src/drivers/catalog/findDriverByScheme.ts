import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { DRIVER_DESCRIPTORS } from './driverDescriptors';

export function findDriverByScheme(scheme: string): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.connectionSchemes.includes(scheme));
}
