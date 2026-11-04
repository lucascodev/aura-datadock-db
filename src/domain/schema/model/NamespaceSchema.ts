import type { DriverId } from '../../driver/model/DriverId';
import type { TableDefinition } from './TableDefinition';

export interface NamespaceSchema {
  readonly kind: DriverId;
  readonly namespace: string;
  readonly tables: readonly TableDefinition[];
}
