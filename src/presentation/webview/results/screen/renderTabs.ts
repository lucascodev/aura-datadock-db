import { summarizeSql } from '../../../../application/query/analysis/statements/summarizeSql';
import type { ResultSetView } from '../../../contracts/ResultsMessages';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';

const TAB_LABEL_CHARACTERS = 28;

export function renderTabs(context: ResultsContext, results: readonly ResultSetView[]): HTMLElement {
  const buttons = results.map((result, index) =>
    createElement('button', {
      className: ['tab', index === context.session.resultIndex ? 'active' : '', result.status === 'error' ? 'failed' : ''].filter(Boolean).join(' '),
      text: `${index + 1}. ${summarizeSql(result.sql, TAB_LABEL_CHARACTERS)}`,
      title: result.sql,
      onClick: () => {
        context.session.selectResult(index);
        context.rerender();
      },
    }),
  );
  return createElement('div', { className: 'tabs' }, buttons);
}
