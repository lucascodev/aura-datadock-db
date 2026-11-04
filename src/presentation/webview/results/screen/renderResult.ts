import type { ExportFormatView, ResultSetView } from '../../../contracts/ResultsMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';
import { renderRows } from '../rows/renderRows';

export function renderResult(context: ResultsContext, result: ResultSetView, exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  if (result.status === 'error') {
    return [createElement('div', { className: 'error', text: result.message })];
  }
  if (result.status === 'command') {
    return [createElement('div', { className: 'summary', text: l10n.t('{0} row(s) affected · {1} ms', result.affectedRows, result.durationMs) })];
  }
  return renderRows(context, result, exportFormats);
}
