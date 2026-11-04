import type { DriverId } from '../../../domain/driver/model/DriverId';
import { findDriverByImage } from '../../../drivers/catalog/findDriverByImage';

export function detectDatabaseKind(image: string): DriverId | undefined {
  return findDriverByImage(image.split('@')[0])?.id;
}
