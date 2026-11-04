import { beforeEach, describe, expect, it } from 'vitest';
import type { TableColumnView } from '../../../../src/presentation/contracts/TableEditorMessages';
import { columnTypeBadge } from '../../../../src/presentation/webview/table/data/grid/columnTypeBadge';
import { DataTabState } from '../../../../src/presentation/webview/table/data/state/DataTabState';

function column(name: string, overrides: Partial<TableColumnView> = {}): TableColumnView {
  return { name, dataType: 'text', isNullable: true, isPrimaryKey: false, isForeignKey: false, hasDefault: false, isEditable: true, ...overrides };
}

const columns = [column('id', { isPrimaryKey: true, isNullable: false, hasDefault: true, dataType: 'integer' }), column('name'), column('email', { isNullable: false }), column('total', { isEditable: false })];
const rows = [['1', 'Ana', 'a@x', '10'], ['2', null, 'b@x', '20'], ['3', 'Caio', 'c@x', '30']];
const request = { offset: 0, limit: 3, filters: [] };
const row1 = JSON.stringify({ id: '1' });
const row2 = JSON.stringify({ id: '2' });
const row3 = JSON.stringify({ id: '3' });

describe('DataTabState', () => {
  let state: DataTabState;

  beforeEach(() => {
    state = new DataTabState();
    state.columns = columns;
    state.primaryKey = ['id'];
    state.editability = { canInsert: true, canUpdate: true, canDelete: true };
    state.limit = 3;
    state.applyPage(request, rows, 5, 'SELECT 1');
  });

  describe('loading', () => {
    it('selects the first cell, keeps the SQL and clears busy', () => {
      state.isBusy = true;
      state.applyPage(request, rows, 5, 'SELECT 2');
      expect(state.activeCell).toEqual({ rowId: row1, column: 'id' });
      expect(state.pageSql).toBe('SELECT 2');
      expect(state.isBusy).toBe(false);
    });

    it('keeps the active column when the page changes', () => {
      state.selection.selectCell({ rowId: row2, column: 'email' });
      state.applyPage({ ...request, offset: 3 }, [['4', 'D', 'd@x', '1']], 1, '');
      expect(state.activeCell).toEqual({ rowId: JSON.stringify({ id: '4' }), column: 'email' });
    });

    it('numbers the rows by their position in the table', () => {
      state.applyPage({ ...request, offset: 200 }, rows, 1, '');
      expect(state.display.displayRows().map((row) => row.label)).toEqual(['201', '202', '203']);
    });

    it('describes what was fetched', () => {
      expect(state.display.rowCountLabel()).toMatch(/^3 row\(s\) fetched - 0\.005s, on \d{4}-\d{2}-\d{2} at \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('editing', () => {
    it('overlays an edit on the row, and marks the column', () => {
      state.editing.commitCell({ rowId: row1, column: 'name' }, 'Ana Souza');
      const [row] = state.display.displayRows();
      expect(row.values[1]).toBe('Ana Souza');
      expect(row.changedColumns.has('name')).toBe(true);
    });

    it('forgets an edit that goes back to the original', () => {
      state.editing.commitCell({ rowId: row1, column: 'name' }, 'x');
      state.editing.commitCell({ rowId: row1, column: 'name' }, 'Ana');
      expect(state.changes).toEqual([]);
    });

    it('keeps edits across pages', () => {
      state.editing.commitCell({ rowId: row1, column: 'name' }, 'x');
      state.applyPage({ ...request, offset: 3 }, [['4', 'D', 'd@x', '1']], 1, '');
      expect(state.changes).toHaveLength(1);
      state.applyPage(request, rows, 1, '');
      expect(state.display.displayRows()[0].values[1]).toBe('x');
    });

    it('refuses read-only columns', () => {
      state.editing.commitCell({ rowId: row1, column: 'total' }, '99');
      expect(state.changes).toEqual([]);
    });

    it('refuses everything without permission to update', () => {
      state.editability = { canInsert: true, canUpdate: false, canDelete: false };
      expect(state.display.isCellEditable({ rowId: row1, column: 'name' })).toBe(false);
    });

    it('does not edit a row marked for deletion', () => {
      state.selection.selectCell({ rowId: row1, column: 'name' });
      state.editing.deleteTargetRows();
      expect(state.display.isCellEditable({ rowId: row1, column: 'name' })).toBe(false);
    });

    it('sets NULL only where the column allows it', () => {
      state.selection.selectCell({ rowId: row1, column: 'email' });
      expect(state.display.canSetNull()).toBe(false);
      state.selection.selectCell({ rowId: row1, column: 'name' });
      expect(state.display.canSetNull()).toBe(true);
      state.editing.setActiveNull();
      expect(state.display.displayRows()[0].values[1]).toBeNull();
    });

    it('finds the next editable cell, skipping read-only ones', () => {
      expect(state.selection.nextEditableCell({ rowId: row1, column: 'id' })).toEqual({ rowId: row1, column: 'name' });
      expect(state.selection.nextEditableCell({ rowId: row1, column: 'email' })).toBeUndefined();
    });
  });

  describe('new rows', () => {
    it('shows them first, with the default marked and the first editable cell active', () => {
      state.editing.addRow();
      const [row] = state.display.displayRows();
      expect(row).toMatchObject({ isNew: true, label: '+' });
      expect(row.values).toEqual([undefined, undefined, undefined, undefined]);
      expect(state.activeCell).toEqual({ rowId: row.rowId, column: 'name' });
    });

    it('fills and returns to the default', () => {
      state.editing.addRow();
      const position = state.activeCell as { rowId: string; column: string };
      state.editing.commitCell(position, 'New');
      expect(state.display.displayRows()[0].values[1]).toBe('New');
      state.editing.useDefaultForActive();
      expect(state.display.displayRows()[0].values[1]).toBeUndefined();
    });

    it('accepts NULL in a nullable column', () => {
      state.editing.addRow();
      state.editing.setActiveNull();
      expect(state.display.displayRows()[0].values[1]).toBeNull();
    });

    it('removes a new row instead of marking it for deletion', () => {
      state.editing.addRow();
      state.editing.deleteTargetRows();
      expect(state.changes).toEqual([]);
    });
  });

  describe('duplicating', () => {
    it('copies the values into new rows, without the key or read-only columns', () => {
      state.selection.selectCell({ rowId: row2, column: 'name' });
      state.editing.duplicateTargetRows();
      expect(state.changes).toHaveLength(1);
      expect(state.changes[0]).toMatchObject({ type: 'insert', values: { name: null, email: 'b@x' } });
      expect((state.changes[0] as { values: object }).values).not.toHaveProperty('id');
    });

    it('duplicates every selected row', () => {
      state.selection.selectRow(row1, { isToggle: false, isRange: false });
      state.selection.selectRow(row3, { isToggle: true, isRange: false });
      state.editing.duplicateTargetRows();
      expect(state.changes).toHaveLength(2);
    });

    it('keeps the database default of a new row instead of turning it into NULL', () => {
      state.editing.addRow();
      state.editing.commitCell(state.activeCell as { rowId: string; column: string }, 'Copy');
      state.editing.duplicateTargetRows();
      const [, duplicate] = state.changes;
      expect(duplicate).toMatchObject({ type: 'insert', values: { name: 'Copy' } });
      expect((duplicate as { values: object }).values).not.toHaveProperty('email');
    });

    it('is not offered without permission to insert', () => {
      state.editability = { canInsert: false, canUpdate: false, canDelete: false };
      expect(state.editing.canDuplicate()).toBe(false);
    });
  });

  describe('selection and deletion', () => {
    it('selects one row, toggles with Ctrl and extends with Shift', () => {
      state.selection.selectRow(row1, { isToggle: false, isRange: false });
      expect([...state.selectedRowIds]).toEqual([row1]);
      state.selection.selectRow(row2, { isToggle: true, isRange: false });
      expect(state.selectedRowIds.size).toBe(2);
      state.selection.selectRow(row2, { isToggle: true, isRange: false });
      expect(state.selectedRowIds.size).toBe(1);
      state.selection.selectRow(row1, { isToggle: false, isRange: false });
      state.selection.selectRow(row3, { isToggle: false, isRange: true });
      expect([...state.selectedRowIds]).toEqual([row1, row2, row3]);
    });

    it('deletes the selected rows, or the active row without a selection', () => {
      state.selection.selectCell({ rowId: row2, column: 'name' });
      state.editing.deleteTargetRows();
      expect(state.changes).toEqual([{ type: 'delete', key: { id: '2' } }]);

      state.selection.selectRow(row1, { isToggle: false, isRange: false });
      state.selection.selectRow(row3, { isToggle: true, isRange: false });
      state.editing.deleteTargetRows();
      expect(state.changes).toHaveLength(3);
    });

    it('undoes a deletion when repeated', () => {
      state.selection.selectCell({ rowId: row2, column: 'name' });
      state.editing.deleteTargetRows();
      state.editing.deleteTargetRows();
      expect(state.changes).toEqual([]);
    });

    it('cannot delete rows that cannot be identified', () => {
      state.primaryKey = [];
      state.editability = { canInsert: true, canUpdate: false, canDelete: false };
      state.applyPage(request, rows, 1, '');
      expect(state.editing.canDelete()).toBe(false);
      state.editing.deleteTargetRows();
      expect(state.changes).toEqual([]);
    });
  });

  describe('keyboard movement', () => {
    it('moves between cells, stopping at the edges', () => {
      state.selection.moveActive(1, 1);
      expect(state.activeCell).toEqual({ rowId: row2, column: 'name' });
      state.selection.moveActive(-5, -5);
      expect(state.activeCell).toEqual({ rowId: row1, column: 'id' });
      state.selection.moveActive(99, 99);
      expect(state.activeCell).toEqual({ rowId: row3, column: 'total' });
    });

    it('does nothing without rows', () => {
      state.applyPage(request, [], 1, '');
      expect(() => state.selection.moveActive(1, 1)).not.toThrow();
      expect(state.activeCell).toBeUndefined();
    });
  });

  describe('sorting and filtering', () => {
    it('cycles the sort: ascending, descending, none', () => {
      state.view.cycleSort('name');
      expect(state.sort).toEqual({ column: 'name', isDescending: false });
      state.view.cycleSort('name');
      expect(state.sort).toEqual({ column: 'name', isDescending: true });
      state.view.cycleSort('name');
      expect(state.sort).toBeUndefined();
    });

    it('asks for the chosen filters and expression', () => {
      state.view.addFilter({ column: 'name', operator: 'equals', value: 'x' });
      state.whereExpression = 'id > 1';
      expect(state.view.request(30)).toEqual({ offset: 30, limit: 3, sort: undefined, filters: [{ column: 'name', operator: 'equals', value: 'x' }], whereExpression: 'id > 1' });
      state.view.removeFilter(0);
      expect(state.filters).toEqual([]);
    });

    it('sends no expression when it is empty', () => {
      expect(state.view.selection().whereExpression).toBeUndefined();
    });
  });

  describe('paging', () => {
    it('knows the next page from a full page while the total is unknown', () => {
      expect(state.paging.canGoNext()).toBe(true);
      state.applyPage(request, rows.slice(0, 2), 1, '');
      expect(state.paging.canGoNext()).toBe(false);
    });

    it('uses the total when known', () => {
      state.total = 3;
      expect(state.paging.canGoNext()).toBe(false);
      state.total = 10;
      expect(state.paging.canGoNext()).toBe(true);
      expect(state.paging.canGoLast()).toBe(true);
      expect(state.paging.lastOffset()).toBe(9);
    });

    it('has a last page at the start for an exact multiple', () => {
      state.total = 6;
      expect(state.paging.lastOffset()).toBe(3);
    });

    it('does not go back from the first page', () => {
      expect(state.paging.canGoPrevious()).toBe(false);
      state.applyPage({ ...request, offset: 3 }, rows, 1, '');
      expect(state.paging.canGoPrevious()).toBe(true);
    });

    it('keeps the limit within bounds', () => {
      state.view.setLimit(0);
      expect(state.limit).toBe(1);
      state.view.setLimit(1_000_000);
      expect(state.limit).toBe(5000);
      state.view.setLimit(Number.NaN);
      expect(state.limit).toBe(5000);
    });

    it('does not page while busy', () => {
      state.isBusy = true;
      expect(state.paging.canGoNext()).toBe(false);
    });
  });

  describe('custom SQL results', () => {
    const custom = { sql: 'SELECT 1', columns: ['a', 'b'], rows: [['1', null], ['2', 'x']], isTruncated: true, durationMs: 7 };

    beforeEach(() => {
      state.applyCustomResult(custom);
    });

    it('shows its own columns and rows', () => {
      expect(state.displayColumns.map((item) => item.name)).toEqual(['a', 'b']);
      expect(state.display.displayRows().map((row) => row.values)).toEqual(custom.rows);
      expect(state.activeCell?.column).toBe('a');
    });

    it('allows nothing to be edited, added, duplicated or deleted', () => {
      expect(state.display.isCellEditable({ rowId: 'row:0', column: 'a' })).toBe(false);
      expect(state.editing.canDuplicate()).toBe(false);
      expect(state.editing.canDelete()).toBe(false);
      expect(state.paging.canGoNext()).toBe(false);
    });

    it('says when more rows are available', () => {
      expect(state.display.rowCountLabel()).toContain('more available');
    });

    it('goes back to the table on the next page, keeping pending changes', () => {
      const pending = [{ type: 'delete', key: { id: '1' } }] as const;
      state.changes = pending;
      state.applyPage(request, rows, 1, '');
      expect(state.isCustomResult).toBe(false);
      expect(state.displayColumns).toBe(columns);
      expect(state.changes).toBe(pending);
    });
  });

  it('remembers the width of a column', () => {
    state.view.setWidth('name', 240);
    expect(state.view.getWidth('name')).toBe(240);
    expect(state.view.getWidth('email')).toBeUndefined();
  });

  describe('record view', () => {
    it('moves between records and tells the position', () => {
      expect(state.display.recordPosition()).toEqual({ index: 0, count: 3 });
      state.selection.moveRecord(1);
      expect(state.display.recordPosition().index).toBe(1);
    });
  });
});

describe('columnTypeBadge', () => {
  it.each([
    ['integer', '123'],
    ['bigint', '123'],
    ['numeric(10,2)', '123'],
    ['decimal(10,2)', '123'],
    ['text', 'A-Z'],
    ['character varying(120)', 'A-Z'],
    ['varchar(20)', 'A-Z'],
    ['boolean', 'T/F'],
    ['tinyint(1)', 'T/F'],
    ['timestamp with time zone', 'DT'],
    ['date', 'DT'],
    ['jsonb', '{ }'],
    ['json', '{ }'],
    ['bytea', '01'],
    ['longblob', '01'],
    ['uuid', 'ID'],
  ])('%s shows %s', (dataType, badge) => {
    expect(columnTypeBadge(dataType)).toBe(badge);
  });
});
