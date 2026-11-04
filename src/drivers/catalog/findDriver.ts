import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import type { DriverId } from '../../domain/driver/model/DriverId';
import { DRIVER_DESCRIPTORS } from './driverDescriptors';

export function findDriver(id: DriverId): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.id === id);
}
