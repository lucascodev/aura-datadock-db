import type { ForeignKey } from './ForeignKey';
import type { TableColumn } from './TableColumn';
import type { TableIndex } from './TableIndex';
import type { TableRef } from './TableRef';

export interface TableDefinition extends TableRef {
  readonly columns: readonly TableColumn[];
  readonly primaryKey: readonly string[];
  readonly foreignKeys: readonly ForeignKey[];
  readonly indexes: readonly TableIndex[];
  readonly viewDefinition?: string;
}
