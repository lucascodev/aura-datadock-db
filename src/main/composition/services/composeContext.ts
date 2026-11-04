import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { createConnectionForm } from '../panels/createConnectionForm';
import { createDiagramPanels } from '../panels/createDiagramPanels';
import { createTableEditors } from '../panels/createTableEditors';
import type { ContextInput } from '../model/ContextInput';

export function composeContext(input: ContextInput): DataDockContext {
  const { host, connection, workspace } = input;
  const getContext = () => context;
  const diagrams = createDiagramPanels(host, workspace, getContext);
  const tableEditors = createTableEditors(host, connection, workspace, getContext);
  const connectionForm = createConnectionForm(input);
  const context: DataDockContext = {
    connections: connection.manager,
    savedConnections: connection.savedConnections,
    connectionForm,
    secrets: host.extension.secrets,
    output: host.output,
    schemas: workspace.schemas,
    bindings: workspace.bindings,
    history: workspace.history,
    runs: workspace.runs,
    results: workspace.results,
    diagrams,
    tableEditors,
    schemaTree: input.schemaTree,
    refresh: input.refresh,
    config: host.config,
    createAiProvider: input.createAiProvider,
  };
  return context;
}
