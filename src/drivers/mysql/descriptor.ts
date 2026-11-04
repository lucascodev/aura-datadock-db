import type { DriverDescriptor } from '../../domain/driver/DriverDescriptor';
import { mysqlDialect } from './mysqlDialect';
import { resolveMysqlCredentials } from './resolveMysqlCredentials';

export const mysqlDriver: DriverDescriptor = {
  id: 'mysql',
  label: 'MySQL',
  defaultPort: 3306,
  connectionSchemes: ['mysql'],
  dialect: mysqlDialect,
  docker: {
    imagePatterns: [/(^|\/)(mysql|percona)/i],
    resolveCredentials: resolveMysqlCredentials,
  },
};
