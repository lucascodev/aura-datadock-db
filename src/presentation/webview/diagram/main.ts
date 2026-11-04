import type { DiagramHostMessage, DiagramWebviewMessage } from '../../contracts/DiagramMessages';
import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { connectToHost } from '../shared/host/connectToHost';
import { DiagramController } from './controller/DiagramController';

useL10nCatalog(readL10nCatalog());

const host = connectToHost<DiagramWebviewMessage>();
const controller = new DiagramController(host, document.getElementById('app') as HTMLElement);

window.addEventListener('message', (event: MessageEvent<DiagramHostMessage>) => controller.handleHostMessage(event.data));
host.postMessage({ type: 'ready' });
