import type { DriverDescriptor } from '../../domain/driver/model/DriverDescriptor';
import { mysqlDialect } from '../mysql/mysqlDialect';
import { resolveMysqlCredentials } from '../mysql/resolveMysqlCredentials';

export const mariadbDriver: DriverDescriptor = {
  id: 'mariadb',
  label: 'MariaDB',
  defaultPort: 3306,
  connectionSchemes: ['mariadb'],
  dialect: { ...mysqlDialect, assistantName: 'MariaDB' },
  docker: {
    imagePatterns: [/(^|\/)mariadb/i],
    resolveCredentials: resolveMysqlCredentials,
  },
};
