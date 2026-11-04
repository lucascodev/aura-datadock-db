import type { FilterSuggestion, FilterCompletions } from '../model/FilterCompletions';

export function applyFilterCompletion(text: string, completions: Pick<FilterCompletions, 'wordStart' | 'wordEnd'>, suggestion: FilterSuggestion): { text: string; cursor: number } {
  const insert = `${suggestion.insertText} `;
  return {
    text: `${text.slice(0, completions.wordStart)}${insert}${text.slice(completions.wordEnd).trimStart()}`,
    cursor: completions.wordStart + insert.length,
  };
}
