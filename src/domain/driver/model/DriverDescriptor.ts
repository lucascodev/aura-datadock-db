import type { DriverId } from './DriverId';
import type { ResolvedCredentials } from '../../connection/model/ResolvedCredentials';
import type { SqlDialect } from './SqlDialect';

interface DriverDockerSupport {
  readonly imagePatterns: readonly RegExp[];
  resolveCredentials(env: Readonly<Record<string, string>>): ResolvedCredentials;
}

export interface DriverDescriptor {
  readonly id: DriverId;
  readonly label: string;
  readonly defaultPort: number;
  readonly connectionSchemes: readonly string[];
  readonly defaultNamespace?: string;
  readonly dialect: SqlDialect;
  readonly docker?: DriverDockerSupport;
}
