import type { DriverId } from '../../../domain/driver/model/DriverId';
import { scanStatements } from '../../query/analysis/statements/scanStatements';

const WHOLE_QUERY_START = /^(?:select|with)\b/i;

export function isWholeQuery(kind: DriverId, text: string): boolean {
  const [statement] = scanStatements(text, kind);
  return statement !== undefined && WHOLE_QUERY_START.test(statement.sanitized);
}
