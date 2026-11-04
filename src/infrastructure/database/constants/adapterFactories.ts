import { MysqlAdapter } from '../mysql/adapter/MysqlAdapter';
import { PostgresAdapter } from '../postgres/adapter/PostgresAdapter';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import type { DriverId } from '../../../domain/driver/model/DriverId';

type AdapterFactory = (target: ConnectionTarget) => DatabaseAdapter;

export const ADAPTER_FACTORIES: Readonly<Record<DriverId, AdapterFactory>> = {
  postgres: (target) => new PostgresAdapter(target),
  mysql: (target) => new MysqlAdapter(target),
  mariadb: (target) => new MysqlAdapter(target),
};
