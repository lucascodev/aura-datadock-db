import type { ResultsViewState } from '../../../contracts/ResultsMessages';
import type { ResultView } from '../model/ResultView';

export function nextResultView(current: ResultView, state: ResultsViewState): ResultView {
  return state.phase === 'done' && state.opensAsChart ? 'chart' : current;
}
