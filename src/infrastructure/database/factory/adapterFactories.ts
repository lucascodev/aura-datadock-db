import { MysqlAdapter } from '../mysql/MysqlAdapter';
import { PostgresAdapter } from '../postgres/PostgresAdapter';
import type { ConnectionTarget } from '../../../domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/DatabaseAdapter';
import type { DriverId } from '../../../domain/driver/DriverId';

type AdapterFactory = (target: ConnectionTarget) => DatabaseAdapter;

export const ADAPTER_FACTORIES: Readonly<Record<DriverId, AdapterFactory>> = {
  postgres: (target) => new PostgresAdapter(target),
  mysql: (target) => new MysqlAdapter(target),
  mariadb: (target) => new MysqlAdapter(target),
};
