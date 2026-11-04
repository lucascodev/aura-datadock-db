import { quoteIfNeeded } from '../../../sql/building/quoteIfNeeded';
import type { CompletionRequest } from '../../model/CompletionRequest';
import type { CompletionSuggestion } from '../../model/CompletionSuggestion';

export function suggestNamespaces(request: CompletionRequest): CompletionSuggestion[] {
  return request.schemas.map((schema) => ({
    label: schema.namespace,
    kind: 'namespace',
    insertText: quoteIfNeeded(request.kind, schema.namespace),
  }));
}
