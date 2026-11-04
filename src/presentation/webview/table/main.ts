import type { TableEditorHostMessage, TableEditorWebviewMessage } from '../../contracts/TableEditorMessages';
import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { connectToHost } from '../shared/host/connectToHost';
import { HostMessageReceiver } from './messages/HostMessageReceiver';
import { TableScreen } from './screen/TableScreen';

useL10nCatalog(readL10nCatalog());

const host = connectToHost<TableEditorWebviewMessage>();
const receiver = new HostMessageReceiver(new TableScreen(host, document.getElementById('app') as HTMLElement));

window.addEventListener('message', (event: MessageEvent<TableEditorHostMessage>) => receiver.handle(event.data));
host.postMessage({ type: 'ready' });
