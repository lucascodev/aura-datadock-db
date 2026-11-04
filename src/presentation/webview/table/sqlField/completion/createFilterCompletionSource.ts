import { pickedCompletion } from '@codemirror/autocomplete';
import type { Completion, CompletionSource } from '@codemirror/autocomplete';
import { applyFilterCompletion } from '../../../../../application/editing/browsing/applyFilterCompletion';
import { isWholeQuery } from '../../../../../application/editing/browsing/isWholeQuery';
import { suggestFilterCompletions } from '../../../../../application/editing/browsing/suggestFilterCompletions';
import type { FilterCompletions, FilterSuggestion } from '../../../../../application/editing/model/FilterCompletions';
import type { DriverId } from '../../../../../domain/driver/model/DriverId';

interface FilterColumn {
  readonly name: string;
  readonly dataType: string;
}

interface FilterCompletionSources {
  readonly wholeQuery: CompletionSource;
  getKind(): DriverId;
  getColumns(): readonly FilterColumn[];
}

function toCompletion(completions: FilterCompletions, suggestion: FilterSuggestion): Completion {
  return {
    label: suggestion.label,
    detail: suggestion.detail,
    type: suggestion.detail ? 'property' : 'keyword',
    apply: (view, completion) => {
      const result = applyFilterCompletion(view.state.doc.toString(), completions, suggestion);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: result.text },
        selection: { anchor: result.cursor },
        annotations: pickedCompletion.of(completion),
      });
    },
  };
}

export function createFilterCompletionSource(sources: FilterCompletionSources): CompletionSource {
  return (context) => {
    const text = context.state.doc.toString();
    const kind = sources.getKind();
    if (isWholeQuery(kind, text)) {
      return sources.wholeQuery(context);
    }
    const completions = suggestFilterCompletions(kind, text, context.pos, sources.getColumns());
    const isEmptyWord = completions.wordStart === context.pos;
    if (completions.suggestions.length === 0 || (isEmptyWord && !context.explicit)) {
      return null;
    }
    return { from: completions.wordStart, options: completions.suggestions.map((suggestion) => toCompletion(completions, suggestion)) };
  };
}
