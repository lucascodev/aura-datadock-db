import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';
import type { ResultGrid } from '../grid/ResultGrid';

const CELL_SEPARATOR = '\t';
const NULL_TEXT = '';

export function renderSelectionActions(context: ResultsContext, grid: ResultGrid): HTMLElement[] {
  const copy = (text: string) => context.host.postMessage({ type: 'copyText', text });
  return [
    createElement('button', { className: 'secondary', text: l10n.t('Copy cell'), onClick: () => copy(grid.getSelectedCell() ?? NULL_TEXT) }),
    createElement('button', { className: 'secondary', text: l10n.t('Copy row'), onClick: () => copy((grid.getSelectedRow() ?? []).map((cell) => cell ?? NULL_TEXT).join(CELL_SEPARATOR)) }),
    createElement('button', { className: 'secondary', text: l10n.t('Copy column'), onClick: () => copy((grid.getSelectedColumnValues() ?? []).map((cell) => cell ?? NULL_TEXT).join('\n')) }),
  ];
}
