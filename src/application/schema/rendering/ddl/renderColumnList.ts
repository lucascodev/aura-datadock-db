import type { DriverId } from '../../../../domain/driver/model/DriverId';
import { quoteIdentifier } from '../../../../drivers/catalog/quoteIdentifier';

export function renderColumnList(kind: DriverId, columns: readonly string[]): string {
  return columns.map((column) => quoteIdentifier(kind, column)).join(', ');
}
