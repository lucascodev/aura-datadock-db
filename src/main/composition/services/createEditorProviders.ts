import type * as vscode from 'vscode';
import { findDocumentConnection } from '../../../presentation/vscode/commands/registry/findDocumentConnection';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { SqlCodeLensProvider } from '../../../presentation/vscode/editor/SqlCodeLensProvider';
import { SqlCompletionProvider } from '../../../presentation/vscode/editor/SqlCompletionProvider';
import type { EditorProviders } from '../model/EditorProviders';
import type { WorkspaceServices } from '../model/WorkspaceServices';

export function createEditorProviders(context: DataDockContext, workspace: WorkspaceServices): EditorProviders {
  const { config, output, runs, schemas } = context;
  const connectionFor = (document: vscode.TextDocument) => findDocumentConnection(context, document);

  return {
    codeLenses: new SqlCodeLensProvider({
      isEnabled: () => config().get<boolean>('codeLens.enabled', true),
      connectionFor,
    }),
    completions: new SqlCompletionProvider({
      connectionFor,
      isBusy: () => runs.isRunning,
      listNamespaces: workspace.listNamespaces,
      loadSchema: (targetId, namespace) => schemas.get(targetId, namespace),
      reportError: (error) => output.warn(`Autocomplete: ${error instanceof Error ? error.message : String(error)}`),
    }),
  };
}
