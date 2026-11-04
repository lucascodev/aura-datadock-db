import * as vscode from 'vscode';
import type { CompletionSuggestion, CompletionSuggestionKind } from '../../../application/completion/CompletionSuggestion';
import { suggestCompletions } from '../../../application/completion/suggestCompletions';
import { chooseDefaultNamespace } from '../../../application/schema/loading/chooseDefaultNamespace';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';

const ITEM_KINDS: Readonly<Record<CompletionSuggestionKind, vscode.CompletionItemKind>> = {
  namespace: vscode.CompletionItemKind.Module,
  table: vscode.CompletionItemKind.Struct,
  view: vscode.CompletionItemKind.Interface,
  column: vscode.CompletionItemKind.Field,
  keyword: vscode.CompletionItemKind.Keyword,
};

const SORT_PREFIXES: Readonly<Record<CompletionSuggestionKind, string>> = {
  column: '0',
  table: '1',
  view: '1',
  namespace: '2',
  keyword: '3',
};

interface SqlCompletionDependencies {
  connectionFor(document: vscode.TextDocument): ConnectionTarget | undefined;
  isBusy(): boolean;
  listNamespaces(targetId: string): Promise<string[]>;
  loadSchema(targetId: string, namespace: string): Promise<NamespaceSchema>;
  reportError(error: unknown): void;
}

export class SqlCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly dependencies: SqlCompletionDependencies) {}

  async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | undefined> {
    const target = this.dependencies.connectionFor(document);
    if (!target || this.dependencies.isBusy()) {
      return undefined;
    }
    try {
      const namespaces = await this.dependencies.listNamespaces(target.id);
      const schemas = await Promise.all(namespaces.map((namespace) => this.dependencies.loadSchema(target.id, namespace)));
      return suggestCompletions({
        sql: document.getText(),
        offset: document.offsetAt(position),
        kind: target.kind,
        schemas,
        defaultNamespace: chooseDefaultNamespace(target.kind, target.database, namespaces),
      }).map(toCompletionItem);
    } catch (error) {
      this.dependencies.reportError(error);
      return undefined;
    }
  }
}

function toCompletionItem(suggestion: CompletionSuggestion): vscode.CompletionItem {
  const item = new vscode.CompletionItem(suggestion.label, ITEM_KINDS[suggestion.kind]);
  item.detail = suggestion.detail;
  item.insertText = suggestion.insertText;
  item.filterText = suggestion.label;
  item.sortText = `${SORT_PREFIXES[suggestion.kind]}${suggestion.label}`;
  return item;
}
