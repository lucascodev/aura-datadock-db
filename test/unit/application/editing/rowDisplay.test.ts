import { describe, expect, it } from 'vitest';
import { buildCustomDisplayRows } from '../../../../src/application/editing/display/buildCustomDisplayRows';
import { buildDisplayRows } from '../../../../src/application/editing/display/buildDisplayRows';
import { describeRowCount } from '../../../../src/application/editing/display/describeRowCount';
import { rowKeyOf } from '../../../../src/application/editing/display/rowKeyOf';
import type { RowChange } from '../../../../src/application/editing/model/RowChange';

const columns = [{ name: 'id' }, { name: 'name' }];
const rows = [['1', 'Ana'], ['2', null]];

describe('rowKeyOf', () => {
  it('reads the primary key values from the row', () => {
    expect(rowKeyOf(columns, ['id'], ['7', 'x'])).toEqual({ id: '7' });
  });

  it('has no key without a primary key', () => {
    expect(rowKeyOf(columns, [], ['7', 'x'])).toBeUndefined();
  });
});

describe('buildDisplayRows', () => {
  it('numbers rows by their position in the table and identifies them by key', () => {
    const built = buildDisplayRows(columns, ['id'], rows, 20, []);
    expect(built.map((row) => row.label)).toEqual(['21', '22']);
    expect(built[0]).toMatchObject({ rowId: JSON.stringify({ id: '1' }), isIdentified: true, isNew: false, isDeleted: false });
  });

  it('overlays a pending update and marks the changed columns', () => {
    const changes: RowChange[] = [{ type: 'update', key: { id: '1' }, values: { name: 'Bia' } }];
    const [row] = buildDisplayRows(columns, ['id'], rows, 0, changes);
    expect(row.values).toEqual(['1', 'Bia']);
    expect([...row.changedColumns]).toEqual(['name']);
  });

  it('marks a row pending deletion', () => {
    const changes: RowChange[] = [{ type: 'delete', key: { id: '2' } }];
    expect(buildDisplayRows(columns, ['id'], rows, 0, changes).map((row) => row.isDeleted)).toEqual([false, true]);
  });

  it('puts new rows first, leaving unset columns on their default', () => {
    const changes: RowChange[] = [{ type: 'insert', id: 'a', values: { name: 'N' } }];
    const [first] = buildDisplayRows(columns, ['id'], rows, 0, changes);
    expect(first).toMatchObject({ rowId: 'new:a', label: '+', isNew: true, values: [undefined, 'N'] });
  });

  it('does not identify rows of a table without primary key', () => {
    const [row] = buildDisplayRows(columns, [], rows, 0, []);
    expect(row).toMatchObject({ rowId: 'row:0', isIdentified: false });
  });
});

describe('buildCustomDisplayRows', () => {
  it('numbers the rows from one and never identifies them', () => {
    expect(buildCustomDisplayRows(rows).map((row) => [row.rowId, row.label, row.isIdentified])).toEqual([['row:0', '1', false], ['row:1', '2', false]]);
  });
});

describe('describeRowCount', () => {
  it('describes the count and the time', () => {
    expect(describeRowCount(3, false, 1500, undefined)).toBe('3 row(s) fetched - 1.500s');
  });

  it('tells when more rows are available', () => {
    expect(describeRowCount(3, true, 5, undefined)).toBe('3 row(s) fetched, more available - 0.005s');
  });

  it('adds when the rows were fetched', () => {
    expect(describeRowCount(1, false, 0, new Date(2024, 0, 2, 3, 4, 5))).toBe('1 row(s) fetched - 0.000s, on 2024-01-02 at 03:04:05');
  });
});
