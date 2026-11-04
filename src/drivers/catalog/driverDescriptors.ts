import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { mariadbDriver } from '../mariadb/descriptor';
import { mysqlDriver } from '../mysql/descriptor';
import { postgresDriver } from '../postgres/descriptor';

export const DRIVER_DESCRIPTORS: readonly DriverDescriptor[] = [postgresDriver, mysqlDriver, mariadbDriver];
