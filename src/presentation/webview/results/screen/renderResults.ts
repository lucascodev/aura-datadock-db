import type { ResultsContext } from '../model/ResultsContext';
import { renderDone } from './renderDone';
import { renderRunning } from './renderRunning';

export function renderResults(context: ResultsContext): void {
  const { app, session } = context;
  session.disposeChart();
  const { state } = session;
  if (!state) {
    return;
  }
  if (state.phase === 'running') {
    app.replaceChildren(renderRunning(context, state.connectionName, state.sql));
    return;
  }
  renderDone(context, state);
}
