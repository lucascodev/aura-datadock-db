import type { DriverId } from '../../../../domain/driver/model/DriverId';
import { getDriver } from '../../../../drivers/catalog/getDriver';
import { listDrivers } from '../../../../drivers/catalog/listDrivers';

export function buildServerSideCallPattern(kind?: DriverId): RegExp {
  const names = kind ? getDriver(kind).dialect.serverSideFunctions : listDrivers().flatMap((driver) => driver.dialect.serverSideFunctions);
  return names.length > 0 ? new RegExp(`\\b(${names.join('|')})\\s*\\(`) : /$^/;
}
