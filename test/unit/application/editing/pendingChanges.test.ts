import { describe, expect, it } from 'vitest';
import type { DisplayRow } from '../../../../src/application/editing/grid/model/DisplayRow';
import type { EditorColumn } from '../../../../src/application/editing/grid/model/EditorColumn';
import type { RowChange } from '../../../../src/application/editing/model/RowChange';
import { canDeleteRows } from '../../../../src/application/editing/permissions/canDeleteRows';
import { canSetNull } from '../../../../src/application/editing/permissions/canSetNull';
import { isCellEditable } from '../../../../src/application/editing/permissions/isCellEditable';
import { appendDuplicates } from '../../../../src/application/editing/pendingInserts/appendDuplicates';
import { applyCellEdit } from '../../../../src/application/editing/pendingUpdates/applyCellEdit';
import { applyRowDeletions } from '../../../../src/application/editing/pendingUpdates/applyRowDeletions';

function column(name: string, overrides: Partial<EditorColumn> = {}): EditorColumn {
  return { name, isNullable: true, isEditable: true, hasDefault: false, isPrimaryKey: false, ...overrides };
}

function displayRow(overrides: Partial<DisplayRow> = {}): DisplayRow {
  return { rowId: 'r', label: '1', isNew: false, isDeleted: false, isIdentified: true, values: [], changedColumns: new Set(), ...overrides };
}

const columns = [column('id', { isPrimaryKey: true }), column('name')];
const editability = { canInsert: true, canUpdate: true, canDelete: true };

describe('isCellEditable', () => {
  it('allows an identified row when updating is allowed', () => {
    expect(isCellEditable(false, columns[1], displayRow(), editability)).toBe(true);
    expect(isCellEditable(false, columns[1], displayRow(), { ...editability, canUpdate: false })).toBe(false);
  });

  it('always allows a new row', () => {
    expect(isCellEditable(false, columns[1], displayRow({ isNew: true }), { canInsert: true, canUpdate: false, canDelete: false })).toBe(true);
  });

  it('refuses custom results, deleted rows, read-only columns and unknown cells', () => {
    expect(isCellEditable(true, columns[1], displayRow(), editability)).toBe(false);
    expect(isCellEditable(false, columns[1], displayRow({ isDeleted: true }), editability)).toBe(false);
    expect(isCellEditable(false, column('x', { isEditable: false }), displayRow(), editability)).toBe(false);
    expect(isCellEditable(false, undefined, displayRow(), editability)).toBe(false);
    expect(isCellEditable(false, columns[1], undefined, editability)).toBe(false);
  });
});

describe('canSetNull', () => {
  it('needs a nullable column in an editable cell', () => {
    expect(canSetNull(column('a'), true)).toBe(true);
    expect(canSetNull(column('a', { isNullable: false }), true)).toBe(false);
    expect(canSetNull(column('a'), false)).toBe(false);
    expect(canSetNull(undefined, true)).toBe(false);
  });
});

describe('canDeleteRows', () => {
  const findRow = (rowId: string) => (rowId === 'known' ? displayRow() : displayRow({ isIdentified: false }));

  it('always lets a new row go', () => {
    expect(canDeleteRows(false, false, ['new:a'], findRow)).toBe(true);
  });

  it('needs permission and an identified row for stored rows', () => {
    expect(canDeleteRows(false, true, ['known'], findRow)).toBe(true);
    expect(canDeleteRows(false, false, ['known'], findRow)).toBe(false);
    expect(canDeleteRows(false, true, ['other'], findRow)).toBe(false);
  });

  it('refuses custom results', () => {
    expect(canDeleteRows(true, true, ['new:a'], findRow)).toBe(false);
  });
});

describe('applyCellEdit', () => {
  const rows = [['1', 'Ana']];

  it('records an update against the original value', () => {
    const changes = applyCellEdit([], { rowId: JSON.stringify({ id: '1' }), column: 'name' }, 'Bia', columns, ['id'], rows);
    expect(changes).toEqual([{ type: 'update', key: { id: '1' }, values: { name: 'Bia' } }]);
  });

  it('forgets an update that returns to the original', () => {
    const position = { rowId: JSON.stringify({ id: '1' }), column: 'name' };
    const edited = applyCellEdit([], position, 'Bia', columns, ['id'], rows);
    expect(applyCellEdit(edited, position, 'Ana', columns, ['id'], rows)).toEqual([]);
  });

  it('edits a pending insert', () => {
    const start: RowChange[] = [{ type: 'insert', id: 'a', values: {} }];
    expect(applyCellEdit(start, { rowId: 'new:a', column: 'name' }, 'N', columns, ['id'], rows)).toEqual([{ type: 'insert', id: 'a', values: { name: 'N' } }]);
  });
});

describe('applyRowDeletions', () => {
  const key = JSON.stringify({ id: '1' });

  it('removes new rows and marks stored ones for deletion', () => {
    const start: RowChange[] = [{ type: 'insert', id: 'a', values: {} }];
    expect(applyRowDeletions(start, ['new:a', key], true, () => true)).toEqual([{ type: 'delete', key: { id: '1' } }]);
  });

  it('leaves stored rows alone without permission or identity', () => {
    expect(applyRowDeletions([], [key], false, () => true)).toEqual([]);
    expect(applyRowDeletions([], [key], true, () => false)).toEqual([]);
  });
});

describe('appendDuplicates', () => {
  it('copies editable values into new inserts, skipping the key and defaulted cells', () => {
    const row = displayRow({ values: ['1', undefined] });
    const withValue = displayRow({ values: ['2', 'Caio'] });
    const ids = ['x', 'y'];
    const changes = appendDuplicates([], [row, withValue], columns, () => ids.shift() ?? '');
    expect(changes).toEqual([
      { type: 'insert', id: 'x', values: {} },
      { type: 'insert', id: 'y', values: { name: 'Caio' } },
    ]);
  });

  it('keeps the existing changes first', () => {
    const existing: RowChange[] = [{ type: 'delete', key: { id: '9' } }];
    expect(appendDuplicates(existing, [displayRow({ values: ['1', 'A'] })], columns, () => 'n')[0]).toBe(existing[0]);
  });
});
