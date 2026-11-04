import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { RowsResult } from '../model/RowsResult';

export function describeRowCount(visibleRows: number, result: RowsResult): string {
  const total = result.rows.length;
  const isFiltered = visibleRows !== total;
  if (isFiltered && result.isTruncated) {
    return l10n.t('{0} of {1} row(s) (more available, raise auraDataDockDb.maxRows) · {2} ms', visibleRows, total, result.durationMs);
  }
  if (isFiltered) {
    return l10n.t('{0} of {1} row(s) · {2} ms', visibleRows, total, result.durationMs);
  }
  if (result.isTruncated) {
    return l10n.t('{0} row(s) (more available, raise auraDataDockDb.maxRows) · {1} ms', total, result.durationMs);
  }
  return l10n.t('{0} row(s) · {1} ms', total, result.durationMs);
}
