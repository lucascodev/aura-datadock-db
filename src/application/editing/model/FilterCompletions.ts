export interface FilterSuggestion {
  readonly label: string;
  readonly insertText: string;
  readonly detail?: string;
}

export interface FilterCompletions {
  readonly wordStart: number;
  readonly wordEnd: number;
  readonly suggestions: readonly FilterSuggestion[];
}
