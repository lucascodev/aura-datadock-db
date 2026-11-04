import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { DRIVER_DESCRIPTORS } from './driverDescriptors';

export function findDriverByImage(image: string): DriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((driver) => driver.docker?.imagePatterns.some((pattern) => pattern.test(image)));
}
