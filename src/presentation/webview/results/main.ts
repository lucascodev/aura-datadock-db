import type { ResultsHostMessage, ResultsWebviewMessage } from '../../contracts/ResultsMessages';
import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { connectToHost } from '../shared/host/connectToHost';
import type { ResultsContext } from './model/ResultsContext';
import { renderResults } from './screen/renderResults';
import { ResultsSession } from './session/ResultsSession';

useL10nCatalog(readL10nCatalog());

const context: ResultsContext = {
  app: document.getElementById('app') as HTMLElement,
  host: connectToHost<ResultsWebviewMessage>(),
  session: new ResultsSession(),
  rerender: () => renderResults(context),
};

window.addEventListener('message', (event: MessageEvent<ResultsHostMessage>) => {
  if (event.data.type === 'state') {
    context.session.receive(event.data.state);
    context.rerender();
  }
});

context.host.postMessage({ type: 'ready' });
