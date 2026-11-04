import type { DriverId } from '../../../domain/driver/DriverId';
import type { TableRef } from '../../../domain/schema/TableRef';
import type { RowEncoder } from '../encoders/RowEncoder';

export type RowExportFormatId = 'csv' | 'json' | 'ndjson' | 'markdown' | 'sql';

export interface RowExportContext {
  readonly kind: DriverId;
  readonly table?: Pick<TableRef, 'namespace' | 'name'>;
}

export interface RowExportFormat {
  readonly id: RowExportFormatId;
  readonly label: () => string;
  readonly extension: string;
  createEncoder(context: RowExportContext): RowEncoder;
}
