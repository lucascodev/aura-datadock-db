import type { DriverId } from '../driver/DriverId';
import type { TableDefinition } from './TableDefinition';

export interface NamespaceSchema {
  readonly kind: DriverId;
  readonly namespace: string;
  readonly tables: readonly TableDefinition[];
}
