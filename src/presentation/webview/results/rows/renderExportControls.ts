import type { ExportFormatView } from '../../../contracts/ResultsMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ResultsContext } from '../model/ResultsContext';

export function renderExportControls(context: ResultsContext, exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  const { host, session } = context;
  const select = createElement('select', { title: l10n.t('Export format') });
  select.append(...exportFormats.map((format) => {
    const option = createElement('option', { text: format.label });
    option.value = format.id;
    return option;
  }));
  select.value = session.exportFormatId ?? exportFormats[0]?.id ?? '';
  select.addEventListener('change', () => {
    session.rememberExportFormat(select.value as ExportFormatView['id']);
  });

  const send = (destination: 'file' | 'clipboard') =>
    host.postMessage({ type: 'exportResult', resultIndex: session.resultIndex, format: select.value as ExportFormatView['id'], destination });

  return [
    select,
    createElement('button', { className: 'secondary', text: l10n.t('Copy'), title: l10n.t('Copy all rows in this format'), onClick: () => send('clipboard') }),
    createElement('button', { text: l10n.t('Save…'), title: l10n.t('Save all rows to a file'), onClick: () => send('file') }),
  ];
}
