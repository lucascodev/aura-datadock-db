import type { DriverId } from '../../../../domain/driver/model/DriverId';
import { scanStatements } from './scanStatements';

export function splitStatements(sql: string, kind?: DriverId): string[] {
  return scanStatements(sql, kind).map((statement) => statement.sanitized);
}
