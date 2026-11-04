import type { SqlCodeLensProvider } from '../../../presentation/vscode/editor/SqlCodeLensProvider';
import type { SqlCompletionProvider } from '../../../presentation/vscode/editor/SqlCompletionProvider';

export interface EditorProviders {
  readonly codeLenses: SqlCodeLensProvider;
  readonly completions: SqlCompletionProvider;
}
