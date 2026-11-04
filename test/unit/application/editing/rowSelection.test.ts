import { describe, expect, it } from 'vitest';
import type { DisplayRow } from '../../../../src/application/editing/grid/model/DisplayRow';
import { ensureActiveCell } from '../../../../src/application/editing/selection/ensureActiveCell';
import { findNextEditableColumn } from '../../../../src/application/editing/selection/findNextEditableColumn';
import { moveActiveCell } from '../../../../src/application/editing/selection/moveActiveCell';
import { resolveTargetRowIds } from '../../../../src/application/editing/selection/resolveTargetRowIds';
import { selectRows } from '../../../../src/application/editing/selection/selectRows';

function displayRow(rowId: string): DisplayRow {
  return { rowId, label: rowId, isNew: false, isDeleted: false, isIdentified: true, values: [], changedColumns: new Set() };
}

const rows = ['a', 'b', 'c', 'd'].map(displayRow);
const columnNames = ['x', 'y'];
const single = { isToggle: false, isRange: false };

describe('moveActiveCell', () => {
  it('moves and stays inside the grid', () => {
    expect(moveActiveCell(rows, columnNames, { rowId: 'b', column: 'x' }, 1, 1)).toEqual({ rowId: 'c', column: 'y' });
    expect(moveActiveCell(rows, columnNames, { rowId: 'd', column: 'y' }, 5, 5)).toEqual({ rowId: 'd', column: 'y' });
    expect(moveActiveCell(rows, columnNames, { rowId: 'a', column: 'x' }, -1, -1)).toEqual({ rowId: 'a', column: 'x' });
  });

  it('starts at the first cell when nothing is active', () => {
    expect(moveActiveCell(rows, columnNames, undefined, 0, 1)).toEqual({ rowId: 'b', column: 'x' });
  });

  it('keeps the active cell when there is nothing to move over', () => {
    const active = { rowId: 'a', column: 'x' };
    expect(moveActiveCell([], columnNames, active, 1, 1)).toBe(active);
  });
});

describe('ensureActiveCell', () => {
  it('keeps a valid cell', () => {
    const active = { rowId: 'b', column: 'y' };
    expect(ensureActiveCell(rows, columnNames, active)).toBe(active);
  });

  it('keeps the valid half and replaces the missing one', () => {
    expect(ensureActiveCell(rows, columnNames, { rowId: 'gone', column: 'y' })).toEqual({ rowId: 'a', column: 'y' });
    expect(ensureActiveCell(rows, columnNames, { rowId: 'c', column: 'gone' })).toEqual({ rowId: 'c', column: 'x' });
  });

  it('selects the first cell, or none when the grid is empty', () => {
    expect(ensureActiveCell(rows, columnNames, undefined)).toEqual({ rowId: 'a', column: 'x' });
    expect(ensureActiveCell([], columnNames, { rowId: 'a', column: 'x' })).toBeUndefined();
  });
});

describe('selectRows', () => {
  const ids = rows.map((row) => row.rowId);

  it('selects a single row and anchors on it', () => {
    expect(selectRows(new Set(['a']), 'a', ids, 'c', single)).toEqual({ selectedRowIds: new Set(['c']), anchor: 'c' });
  });

  it('toggles a row in and out', () => {
    const added = selectRows(new Set(['a']), 'a', ids, 'c', { isToggle: true, isRange: false });
    expect(added.selectedRowIds).toEqual(new Set(['a', 'c']));
    expect(selectRows(added.selectedRowIds, added.anchor, ids, 'a', { isToggle: true, isRange: false }).selectedRowIds).toEqual(new Set(['c']));
  });

  it('selects a range from the anchor, in either direction, keeping the anchor', () => {
    expect(selectRows(new Set(), 'b', ids, 'd', { isToggle: false, isRange: true })).toEqual({ selectedRowIds: new Set(['b', 'c', 'd']), anchor: 'b' });
    expect(selectRows(new Set(), 'c', ids, 'a', { isToggle: false, isRange: true }).selectedRowIds).toEqual(new Set(['a', 'b', 'c']));
  });

  it('treats a range without anchor as a single selection', () => {
    expect(selectRows(new Set(), undefined, ids, 'c', { isToggle: false, isRange: true })).toEqual({ selectedRowIds: new Set(['c']), anchor: 'c' });
  });
});

describe('resolveTargetRowIds', () => {
  it('prefers the selection, then the active row', () => {
    expect(resolveTargetRowIds(new Set(['a', 'b']), { rowId: 'c', column: 'x' })).toEqual(['a', 'b']);
    expect(resolveTargetRowIds(new Set(), { rowId: 'c', column: 'x' })).toEqual(['c']);
    expect(resolveTargetRowIds(new Set(), undefined)).toEqual([]);
  });
});

describe('findNextEditableColumn', () => {
  const columns = ['x', 'y', 'z'].map((name) => ({ name, isNullable: true, isEditable: true, hasDefault: false, isPrimaryKey: false }));

  it('skips columns that cannot be edited', () => {
    expect(findNextEditableColumn(columns, 'x', (name) => name === 'z')).toBe('z');
  });

  it('finds nothing after the last editable column', () => {
    expect(findNextEditableColumn(columns, 'z', () => true)).toBeUndefined();
  });
});
