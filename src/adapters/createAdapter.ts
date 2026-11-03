import type { ConnectionTarget } from '../domain/ConnectionTarget';
import type { DatabaseAdapter } from '../domain/DatabaseAdapter';
import { MysqlAdapter } from './mysql/MysqlAdapter';
import { PostgresAdapter } from './postgres/PostgresAdapter';

export function createAdapter(target: ConnectionTarget): DatabaseAdapter {
  switch (target.kind) {
    case 'postgres':
      return new PostgresAdapter(target);
    case 'mysql':
      return new MysqlAdapter(target);
  }
}
