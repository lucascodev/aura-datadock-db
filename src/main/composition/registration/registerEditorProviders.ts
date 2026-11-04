import * as vscode from 'vscode';
import type { EditorProviders } from '../model/EditorProviders';

const SQL_SELECTOR: vscode.DocumentSelector = { language: 'sql' };
const COMPLETION_TRIGGER_CHARACTER = '.';

export function registerEditorProviders(providers: EditorProviders): vscode.Disposable[] {
  return [
    vscode.languages.registerCodeLensProvider(SQL_SELECTOR, providers.codeLenses),
    vscode.languages.registerCompletionItemProvider(SQL_SELECTOR, providers.completions, COMPLETION_TRIGGER_CHARACTER),
  ];
}
