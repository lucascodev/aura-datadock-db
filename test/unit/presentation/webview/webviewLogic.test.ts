import { describe, expect, it } from 'vitest';
import { chooseDefaultNamespace } from '../../../../src/application/schema/loading/chooseDefaultNamespace';
import type { DiagramEdge } from '../../../../src/application/diagram/model/DiagramModel';
import { toResultSetView } from '../../../../src/presentation/vscode/panels/results/toResultSetView';
import { centerOn } from '../../../../src/presentation/webview/diagram/canvas/centerOn';
import { clampScale } from '../../../../src/presentation/webview/diagram/canvas/clampScale';
import { fitToView } from '../../../../src/presentation/webview/diagram/canvas/fitToView';
import { zoomAt } from '../../../../src/presentation/webview/diagram/canvas/zoomAt';
import { relatedEdges } from '../../../../src/presentation/webview/diagram/canvas/relatedEdges';
import { relatedTableNames } from '../../../../src/presentation/webview/diagram/canvas/relatedTableNames';
import { filterRows } from '../../../../src/presentation/webview/results/grid/filterRows';
import { nextSort } from '../../../../src/presentation/webview/results/grid/nextSort';
import { sortRows } from '../../../../src/presentation/webview/results/grid/sortRows';

describe('orderRows', () => {
  const rows = [['b', '10'], ['a', '9'], [null, '100']];

  it('filters by any cell, ignoring case', () => {
    expect(filterRows(rows, ' A ')).toEqual([['a', '9']]);
    expect(filterRows(rows, '10')).toHaveLength(2);
  });

  it('returns every row without a filter', () => {
    expect(filterRows(rows, '')).toHaveLength(3);
  });

  it('sorts numeric columns by value, not as text', () => {
    const sorted = sortRows(rows, { columnIndex: 1, direction: 'ascending' }, true);
    expect(sorted.map((row) => row[1])).toEqual(['9', '10', '100']);
  });

  it('keeps NULL last in both directions', () => {
    expect(sortRows(rows, { columnIndex: 0, direction: 'ascending' }, false).map((row) => row[0])).toEqual(['a', 'b', null]);
    expect(sortRows(rows, { columnIndex: 0, direction: 'descending' }, false).map((row) => row[0])).toEqual(['b', 'a', null]);
  });

  it('does not change the original rows', () => {
    const original = [...rows];
    sortRows(rows, { columnIndex: 1, direction: 'descending' }, true);
    expect(rows).toEqual(original);
  });

  it('cycles the sort: ascending, descending, none', () => {
    const ascending = nextSort(undefined, 2);
    expect(ascending).toEqual({ columnIndex: 2, direction: 'ascending' });
    const descending = nextSort(ascending, 2);
    expect(descending).toEqual({ columnIndex: 2, direction: 'descending' });
    expect(nextSort(descending, 2)).toBeUndefined();
  });

  it('starts ascending when the column changes', () => {
    expect(nextSort({ columnIndex: 1, direction: 'descending' }, 2)).toEqual({ columnIndex: 2, direction: 'ascending' });
  });
});

describe('Viewport', () => {
  it('keeps the point under the cursor fixed when zooming', () => {
    const before = { x: 10, y: 20, scale: 1 };
    const after = zoomAt(before, 2, 100, 100);
    const contentX = (100 - before.x) / before.scale;
    expect(contentX * after.scale + after.x).toBeCloseTo(100);
  });

  it('limits the scale', () => {
    expect(clampScale(100)).toBe(2.5);
    expect(clampScale(0)).toBe(0.1);
  });

  it('fits large content inside the view and centers it', () => {
    const fitted = fitToView({ left: 0, top: 0, right: 2000, bottom: 1000 }, 1000, 800);
    expect(fitted.scale).toBeLessThan(1);
    expect(2000 * fitted.scale + fitted.x * 2).toBeCloseTo(1000);
  });

  it('does not enlarge small content beyond its real size', () => {
    expect(fitToView({ left: 0, top: 0, right: 100, bottom: 100 }, 1000, 800).scale).toBe(1);
  });

  it('accounts for content that does not start at the origin', () => {
    const fitted = fitToView({ left: 500, top: 500, right: 600, bottom: 600 }, 1000, 800);
    expect(500 * fitted.scale + fitted.x + (100 * fitted.scale) / 2).toBeCloseTo(500);
  });

  it('centers on a point', () => {
    const centered = centerOn(100, 200, 1, 1000, 800);
    expect(100 + centered.x).toBe(500);
    expect(200 + centered.y).toBe(400);
  });
});

describe('relatedTables', () => {
  const edge = (childTable: string, parentTable: string): DiagramEdge => ({ id: childTable, name: childTable, childTable, parentTable, cardinality: 'one-to-many', isParentOptional: false });
  const edges = [edge('orders', 'customers'), edge('items', 'orders'), edge('logs', 'users')];

  it('finds edges on both sides', () => {
    expect(relatedEdges(edges, 'orders').map((item) => item.childTable)).toEqual(['orders', 'items']);
  });

  it('includes the table itself and its direct neighbors only', () => {
    expect([...relatedTableNames(edges, 'orders')].sort()).toEqual(['customers', 'items', 'orders']);
  });
});

describe('toResultSetView', () => {
  it('formats values and keeps NULL apart from the text "null"', () => {
    const view = toResultSetView({
      status: 'success',
      sql: 'SELECT',
      result: { columns: ['a', 'b', 'c'], rows: [[null, 'null', { x: 1 }]], truncated: false, durationMs: 1 },
    });
    expect(view).toMatchObject({ status: 'rows', rows: [[null, 'null', '{"x":1}']] });
  });

  it('detects numeric columns, including numbers that drivers return as text', () => {
    const view = toResultSetView({
      status: 'success',
      sql: 'SELECT',
      result: { columns: ['n', 'decimal', 'text', 'empty'], rows: [[1, '10.50', 'abc', null], [null, '2', '3', null]], truncated: false, durationMs: 1 },
    });
    expect(view.status === 'rows' && view.columns.map((column) => column.isNumeric)).toEqual([true, true, false, false]);
  });

  it('shows statements without rows as a command', () => {
    const view = toResultSetView({ status: 'success', sql: 'INSERT', result: { columns: [], rows: [], affectedRows: 3, truncated: false, durationMs: 1 } });
    expect(view).toMatchObject({ status: 'command', affectedRows: 3 });
  });

  it('shows failures', () => {
    expect(toResultSetView({ status: 'failure', sql: 'BAD', message: 'boom' })).toEqual({ status: 'error', sql: 'BAD', message: 'boom' });
  });
});

describe('chooseDefaultNamespace', () => {
  it('prefers public on Postgres', () => {
    expect(chooseDefaultNamespace('postgres', 'shop', ['logistics', 'public'])).toBe('public');
  });

  it('prefers the connection database on MySQL', () => {
    expect(chooseDefaultNamespace('mysql', 'shop', ['logistics', 'shop'])).toBe('shop');
  });

  it('falls back to the first namespace', () => {
    expect(chooseDefaultNamespace('postgres', undefined, ['app', 'audit'])).toBe('app');
    expect(chooseDefaultNamespace('mysql', undefined, [])).toBeUndefined();
  });
});
