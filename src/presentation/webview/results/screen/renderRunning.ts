import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';

export function renderRunning(context: ResultsContext, connectionName: string, sql: string): HTMLElement {
  return createElement('div', { className: 'running' }, [
    createElement('div', { className: 'running-title', text: l10n.t('Running on {0}…', connectionName) }),
    createElement('pre', { className: 'sql', text: sql }),
    createElement('button', { text: l10n.t('Cancel'), onClick: () => context.host.postMessage({ type: 'cancel' }) }),
  ]);
}
