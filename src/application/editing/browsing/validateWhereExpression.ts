import type { DriverId } from '../../../domain/driver/model/DriverId';
import { classifyQuery } from '../../query/analysis/classification/classifyQuery';
import { scanStatements } from '../../query/analysis/statements/scanStatements';
import { l10n } from '../../../domain/i18n/translation/l10n';
import { isWholeQuery } from './isWholeQuery';

const WHERE_PREFIX = 'SELECT 1 WHERE ';
const LINE_AFTER_EXPRESSION = '\n1';

export function validateWhereExpression(kind: DriverId, expression: string): void {
  if (isWholeQuery(kind, expression)) {
    throw new Error(l10n.t('This field only takes a condition, such as id > 10. To run a whole query, use Show SQL.'));
  }
  if (hasStatementTerminator(kind, expression)) {
    throw new Error(l10n.t('The filter must be a single expression, without a semicolon.'));
  }
  if (classifyQuery(`${WHERE_PREFIX}${expression}`, kind).risk !== 'read') {
    throw new Error(l10n.t('The filter can only read data. If this is the name of a column, write it in quotes.'));
  }
}

function hasStatementTerminator(kind: DriverId, expression: string): boolean {
  return scanStatements(`${WHERE_PREFIX}${expression}${LINE_AFTER_EXPRESSION}`, kind).length > 1;
}
