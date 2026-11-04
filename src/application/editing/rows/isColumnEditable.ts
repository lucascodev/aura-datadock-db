import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableColumn } from '../../../domain/schema/model/TableColumn';
import { getDriver } from '../../../drivers/catalog/getDriver';

export function isColumnEditable(column: TableColumn, kind: DriverId): boolean {
  const isAlwaysGenerated = column.generationClause?.includes('ALWAYS') ?? false;
  return !column.isComputed && !isAlwaysGenerated && !getDriver(kind).dialect.isBinaryType(column.dataType);
}
