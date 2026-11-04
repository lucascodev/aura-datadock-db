import type { DriverId } from '../../../domain/driver/DriverId';
import { classifyQuery } from '../../query/analysis/classifyQuery';
import { l10n } from '../../../domain/i18n/l10n';

export function validateWhereExpression(kind: DriverId, expression: string): void {
  const classification = classifyQuery(`SELECT 1 WHERE ${expression}`, kind);
  if (classification.statementCount !== 1) {
    throw new Error(l10n.t('The filter must be a single expression, without a semicolon.'));
  }
  if (classification.risk !== 'read') {
    throw new Error(l10n.t('The filter can only read data. If this is the name of a column, write it in quotes.'));
  }
}
