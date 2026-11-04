import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { openTableOf } from '../../../presentation/vscode/commands/table/open/openTableOf';
import { saveSchemaExport } from '../../../presentation/vscode/commands/schema/saveSchemaExport';
import { DiagramPanels } from '../../../presentation/vscode/panels/diagram/DiagramPanels';
import type { HostEnvironment } from '../model/HostEnvironment';
import type { WorkspaceServices } from '../model/WorkspaceServices';

export function createDiagramPanels(host: HostEnvironment, workspace: WorkspaceServices, getContext: () => DataDockContext): DiagramPanels {
  const { schemas } = workspace;
  return new DiagramPanels({
    extensionUri: host.extension.extensionUri,
    storage: host.extension.workspaceState,
    listNamespaces: workspace.listNamespaces,
    loadSchema: (targetId, namespace) => schemas.get(targetId, namespace),
    invalidateSchema: (targetId) => schemas.invalidate(targetId),
    openTable: (target, table) => openTableOf(getContext(), target, table),
    saveSchemaExport,
  });
}
