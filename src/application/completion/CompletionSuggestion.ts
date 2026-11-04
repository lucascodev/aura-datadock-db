export type CompletionSuggestionKind = 'namespace' | 'table' | 'view' | 'column' | 'keyword';

export interface CompletionSuggestion {
  readonly label: string;
  readonly kind: CompletionSuggestionKind;
  readonly detail?: string;
  readonly insertText: string;
}
