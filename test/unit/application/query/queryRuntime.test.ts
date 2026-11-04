import { describe, expect, it, vi } from 'vitest';
import { buildExplain } from '../../../../src/application/query/analysis/statements/buildExplain';
import { QueryDocumentBindings } from '../../../../src/application/query/documents/QueryDocumentBindings';
import { QueryHistory } from '../../../../src/application/query/history/QueryHistory';
import type { KeyValueStore } from '../../../../src/application/query/ports/KeyValueStore';
import type { QueryHistoryEntry } from '../../../../src/application/query/model/QueryHistoryEntry';
import { QueryRunTracker } from '../../../../src/application/query/execution/QueryRunTracker';
import { runStatements } from '../../../../src/application/query/execution/runStatements';
import { summarizeOutcomes } from '../../../../src/application/query/execution/summarizeOutcomes';
import { summarizeSql } from '../../../../src/application/query/analysis/statements/summarizeSql';
import type { QueryResult } from '../../../../src/domain/database/model/QueryResult';

const emptyResult: QueryResult = { columns: ['a'], rows: [[1]], truncated: false, durationMs: 5 };

describe('runStatements', () => {
  it('runs in order and returns one outcome per statement', async () => {
    const runQuery = vi.fn().mockResolvedValue(emptyResult);
    const outcomes = await runStatements({ runQuery }, ['SELECT 1', 'SELECT 2'], { maxRows: 10 });

    expect(runQuery.mock.calls).toEqual([['SELECT 1', 10], ['SELECT 2', 10]]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual(['success', 'success']);
  });

  it('stops at the first failure and keeps earlier results', async () => {
    const runQuery = vi.fn().mockResolvedValueOnce(emptyResult).mockRejectedValueOnce(new Error('boom'));
    const outcomes = await runStatements({ runQuery }, ['SELECT 1', 'BAD', 'SELECT 3'], { maxRows: 10 });

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(outcomes[1]).toEqual({ status: 'failure', sql: 'BAD', message: 'boom' });
    expect(outcomes).toHaveLength(2);
  });

  it('does not start remaining statements after cancellation', async () => {
    const controller = new AbortController();
    const runQuery = vi.fn().mockImplementation(async () => {
      controller.abort();
      return emptyResult;
    });

    const outcomes = await runStatements({ runQuery }, ['SELECT 1', 'SELECT 2'], { maxRows: 10, signal: controller.signal });
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(outcomes).toHaveLength(1);
  });
});

describe('summarizeOutcomes', () => {
  it('sums durations and reports the failure', () => {
    const entry = summarizeOutcomes('SELECT 1; BAD', { key: 'docker:db', name: 'db' }, 100, [
      { status: 'success', sql: 'SELECT 1', result: emptyResult },
      { status: 'failure', sql: 'BAD', message: 'boom' },
    ]);
    expect(entry).toMatchObject({ connectionKey: 'docker:db', connectionName: 'db', executedAt: 100, durationMs: 5, rowCount: 1, errorMessage: 'boom' });
  });
});

describe('summarizeSql', () => {
  it('skips leading comments and collapses whitespace', () => {
    expect(summarizeSql('-- header\nSELECT 1,\n   2;\nSELECT 3', 50)).toBe('SELECT 1, 2');
  });

  it('truncates long statements', () => {
    expect(summarizeSql('SELECT 123456789', 6)).toBe('SELECT…');
  });

  it('falls back to the text when it has only comments', () => {
    expect(summarizeSql('-- only a comment', 50)).toBe('-- only a comment');
  });
});

describe('buildExplain', () => {
  it('prefixes statements', () => {
    expect(buildExplain('SELECT 1')).toBe('EXPLAIN SELECT 1');
  });

  it('does not double an existing EXPLAIN', () => {
    expect(buildExplain('explain analyze SELECT 1')).toBe('explain analyze SELECT 1');
  });
});

describe('QueryDocumentBindings', () => {
  it('binds, reads and unbinds, notifying listeners', () => {
    const bindings = new QueryDocumentBindings();
    const listener = vi.fn();
    bindings.onDidChange(listener);

    bindings.bind('untitled:1', 'db-a');
    expect(bindings.get('untitled:1')).toBe('db-a');

    bindings.unbind('untitled:1');
    expect(bindings.get('untitled:1')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps each document on its own container', () => {
    const bindings = new QueryDocumentBindings();
    bindings.bind('a', 'db-a');
    bindings.bind('b', 'db-b');
    expect([bindings.get('a'), bindings.get('b')]).toEqual(['db-a', 'db-b']);
  });
});

describe('QueryRunTracker', () => {
  it('allows one run at a time', () => {
    const tracker = new QueryRunTracker();
    expect(tracker.begin()).toBeDefined();
    expect(tracker.begin()).toBeUndefined();
    tracker.finish();
    expect(tracker.begin()).toBeDefined();
  });

  it('aborts the current run on cancel', () => {
    const tracker = new QueryRunTracker();
    const controller = tracker.begin();
    expect(tracker.cancel()).toBe(true);
    expect(controller?.signal.aborted).toBe(true);
  });

  it('reports nothing to cancel when idle', () => {
    expect(new QueryRunTracker().cancel()).toBe(false);
  });
});

describe('QueryHistory', () => {
  function createStore(): KeyValueStore {
    const values = new Map<string, unknown>();
    return {
      get: <T>(key: string) => values.get(key) as T | undefined,
      update: async (key, value) => {
        values.set(key, value);
      },
    };
  }

  const entry = (sql: string): QueryHistoryEntry => ({ sql, connectionKey: 'docker:db', connectionName: 'db', executedAt: 1, durationMs: 1 });

  it('keeps the newest entries first and trims to the limit', async () => {
    const history = new QueryHistory(createStore(), () => 2);
    await history.add(entry('a'));
    await history.add(entry('b'));
    await history.add(entry('c'));
    expect(history.list().map((item) => item.sql)).toEqual(['c', 'b']);
  });

  it('stores nothing when the limit is zero', async () => {
    const history = new QueryHistory(createStore(), () => 0);
    await history.add(entry('a'));
    expect(history.list()).toEqual([]);
  });

  it('clears', async () => {
    const history = new QueryHistory(createStore(), () => 5);
    await history.add(entry('a'));
    await history.clear();
    expect(history.list()).toEqual([]);
  });
});
