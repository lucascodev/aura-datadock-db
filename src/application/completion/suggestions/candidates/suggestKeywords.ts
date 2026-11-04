import { SQL_KEYWORDS } from '../../../sql/constants/sqlKeywords';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';

export function suggestKeywords(): CompletionSuggestion[] {
  return SQL_KEYWORDS.map((keyword) => ({ label: keyword, kind: 'keyword', insertText: keyword }));
}
