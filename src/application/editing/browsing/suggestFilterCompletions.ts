import type { DriverId } from '../../../domain/driver/model/DriverId';
import { quoteIfNeeded } from '../../sql/building/quoteIfNeeded';
import type { FilterSuggestion, FilterCompletions } from '../model/FilterCompletions';

interface FilterColumn {
  readonly name: string;
  readonly dataType: string;
}

const WORD_CHARACTER = /[\w$]/;

const OPERATORS = ['IS NULL', 'IS NOT NULL', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'BETWEEN', 'AND', 'OR', 'NOT'];

export function suggestFilterCompletions(kind: DriverId, text: string, cursor: number, columns: readonly FilterColumn[]): FilterCompletions {
  const wordStart = findWordStart(text, cursor);
  const wordEnd = findWordEnd(text, cursor);
  const typed = text.slice(wordStart, cursor).toLowerCase();

  const columnSuggestions = columns
    .filter((column) => column.name.toLowerCase().startsWith(typed))
    .map((column): FilterSuggestion => ({ label: column.name, insertText: quoteIfNeeded(kind, column.name), detail: column.dataType }));
  const operatorSuggestions = OPERATORS.filter((operator) => operator.toLowerCase().startsWith(typed)).map((operator): FilterSuggestion => ({ label: operator, insertText: operator }));

  return { wordStart, wordEnd, suggestions: [...columnSuggestions, ...operatorSuggestions] };
}

function findWordStart(text: string, cursor: number): number {
  let start = cursor;
  while (start > 0 && WORD_CHARACTER.test(text[start - 1])) {
    start--;
  }
  return start;
}

function findWordEnd(text: string, cursor: number): number {
  let end = cursor;
  while (end < text.length && WORD_CHARACTER.test(text[end])) {
    end++;
  }
  return end;
}
