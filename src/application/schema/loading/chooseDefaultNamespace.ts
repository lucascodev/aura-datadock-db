import type { DriverId } from '../../../domain/driver/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';

export function chooseDefaultNamespace(kind: DriverId, database: string | undefined, namespaces: readonly string[]): string | undefined {
  const preferred = getDriver(kind).defaultNamespace ?? database;
  return namespaces.find((namespace) => namespace === preferred) ?? namespaces[0];
}
