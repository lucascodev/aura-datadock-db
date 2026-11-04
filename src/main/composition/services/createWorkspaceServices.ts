import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';
import { QueryDocumentBindings } from '../../../application/query/documents/QueryDocumentBindings';
import { QueryRunTracker } from '../../../application/query/execution/QueryRunTracker';
import { QueryHistory } from '../../../application/query/history/QueryHistory';
import { SchemaCache } from '../../../application/schema/loading/SchemaCache';
import { ResultsPanel } from '../../../presentation/vscode/panels/results/ResultsPanel';
import type { HostEnvironment } from '../model/HostEnvironment';
import type { WorkspaceServices } from '../model/WorkspaceServices';

export function createWorkspaceServices(host: HostEnvironment, manager: ConnectionManager): WorkspaceServices {
  const { extension, config } = host;
  return {
    listNamespaces: async (targetId) => (await manager.getAdapter(targetId)).listNamespaces(),
    schemas: new SchemaCache(async (targetId, namespace) => (await manager.getAdapter(targetId)).readSchema(namespace)),
    bindings: new QueryDocumentBindings(),
    history: new QueryHistory(extension.globalState, () => config().get<number>('history.maxEntries', 200)),
    runs: new QueryRunTracker(),
    results: new ResultsPanel(extension.extensionUri),
  };
}
