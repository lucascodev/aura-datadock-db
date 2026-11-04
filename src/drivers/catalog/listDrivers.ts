import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { DRIVER_DESCRIPTORS } from './driverDescriptors';

export function listDrivers(): readonly DriverDescriptor[] {
  return DRIVER_DESCRIPTORS;
}
