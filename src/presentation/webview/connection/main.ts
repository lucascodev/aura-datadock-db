import type { ConnectionFormHostMessage, ConnectionFormWebviewMessage } from '../../contracts/ConnectionFormMessages';
import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { connectToHost } from '../shared/host/connectToHost';
import { ConnectionFormController } from './form/ConnectionFormController';

useL10nCatalog(readL10nCatalog());

const host = connectToHost<ConnectionFormWebviewMessage>();
const controller = new ConnectionFormController(host, document.getElementById('app') as HTMLElement);

window.addEventListener('message', (event: MessageEvent<ConnectionFormHostMessage>) => controller.handleHostMessage(event.data));
host.postMessage({ type: 'ready' });
