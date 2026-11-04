import type { ResultsViewState } from '../../../contracts/ResultsMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';
import { renderResult } from './renderResult';
import { renderTabs } from './renderTabs';

export function renderDone(context: ResultsContext, done: Extract<ResultsViewState, { phase: 'done' }>): void {
  if (done.results.length === 0) {
    context.app.replaceChildren(createElement('div', { className: 'empty', text: l10n.t('The query was canceled before it started.') }));
    return;
  }
  const tabs = done.results.length > 1 ? [renderTabs(context, done.results)] : [];
  const result = done.results[context.session.resultIndex];
  context.app.replaceChildren(...tabs, createElement('pre', { className: 'sql', text: result.sql }), ...renderResult(context, result, done.exportFormats));
}
