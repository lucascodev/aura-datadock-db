import { describe, expect, it } from 'vitest';
import type { ResultsViewState } from '../../../../src/presentation/contracts/ResultsMessages';
import { nextResultView } from '../../../../src/presentation/webview/results/session/nextResultView';

const done = (opensAsChart?: boolean): ResultsViewState => ({ phase: 'done', connectionName: 'db', opensAsChart, results: [], exportFormats: [] });

describe('nextResultView', () => {
  it('stays on the grid by default', () => {
    expect(nextResultView('grid', done())).toBe('grid');
  });

  it('opens on the chart when the result asks for it', () => {
    expect(nextResultView('grid', done(true))).toBe('chart');
  });

  it('keeps the view the person chose when the result does not ask for a chart', () => {
    expect(nextResultView('chart', done(false))).toBe('chart');
    expect(nextResultView('grid', done(false))).toBe('grid');
  });

  it('does not change the view while a query is running', () => {
    expect(nextResultView('grid', { phase: 'running', connectionName: 'db', sql: 'SELECT 1' })).toBe('grid');
  });
});
