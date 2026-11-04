import { l10n } from '../i18n/l10n';

export type CellValue = string | null;

export interface ParameterizedStatement {
  readonly sql: string;
  readonly params: readonly CellValue[];
  readonly preview: string;
  readonly expectedRows?: number;
}

export function assertExpectedRows(statement: ParameterizedStatement, affectedRows: number): void {
  if (statement.expectedRows !== undefined && affectedRows !== statement.expectedRows) {
    throw new Error(l10n.t('Nothing was saved: expected to change {0} row(s) but found {1}. The row may have been changed or removed. Statement: {2}', statement.expectedRows, affectedRows, statement.preview));
  }
}
