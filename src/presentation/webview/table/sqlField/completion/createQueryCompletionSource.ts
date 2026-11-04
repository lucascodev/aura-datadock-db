import type { Completion, CompletionSource } from '@codemirror/autocomplete';
import type { CompletionSuggestion, CompletionSuggestionKind } from '../../../../../application/completion/model/CompletionSuggestion';
import { suggestCompletions } from '../../../../../application/completion/suggestions/complete/suggestCompletions';
import type { NamespaceSchema } from '../../../../../domain/schema/model/NamespaceSchema';

const WORD = /[\w$]*/;
const QUALIFIER = '.';

const COMPLETION_TYPES: Readonly<Record<CompletionSuggestionKind, string>> = {
  column: 'property',
  table: 'class',
  view: 'interface',
  namespace: 'namespace',
  keyword: 'keyword',
};

const BOOSTS: Readonly<Record<CompletionSuggestionKind, number>> = {
  column: 3,
  table: 2,
  view: 2,
  namespace: 1,
  keyword: 0,
};

function toCompletion(suggestion: CompletionSuggestion): Completion {
  return {
    label: suggestion.label,
    detail: suggestion.detail,
    apply: suggestion.insertText,
    type: COMPLETION_TYPES[suggestion.kind],
    boost: BOOSTS[suggestion.kind],
  };
}

export function createQueryCompletionSource(getSchema: () => NamespaceSchema | undefined): CompletionSource {
  return (context) => {
    const schema = getSchema();
    const word = context.matchBefore(WORD);
    if (!schema || !word) {
      return null;
    }
    const isEmptyWord = word.from === word.to;
    if (isEmptyWord && !context.explicit && context.state.sliceDoc(word.from - 1, word.from) !== QUALIFIER) {
      return null;
    }
    const suggestions = suggestCompletions({
      sql: context.state.doc.toString(),
      offset: context.pos,
      kind: schema.kind,
      schemas: [schema],
      defaultNamespace: schema.namespace,
    });
    return { from: word.from, options: suggestions.map(toCompletion) };
  };
}
