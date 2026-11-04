import { describe, expect, it } from 'vitest';
import { selectTableNeighborhood } from '../../../../src/application/diagram/building/selectTableNeighborhood';
import { buildTablePageQuery } from '../../../../src/application/editing/tableQuery/buildTablePageQuery';
import { buildTableSelect } from '../../../../src/application/editing/tableQuery/buildTableSelect';
import { duplicateRowValues } from '../../../../src/application/editing/rows/duplicateRowValues';
import { renderTextTable } from '../../../../src/application/editing/browsing/renderTextTable';
import { applyFilterCompletion } from '../../../../src/application/editing/browsing/applyFilterCompletion';
import { suggestFilterCompletions } from '../../../../src/application/editing/browsing/suggestFilterCompletions';
import { validateWhereExpression } from '../../../../src/application/editing/browsing/validateWhereExpression';
import { findIncomingReferences } from '../../../../src/application/schema/relationships/findIncomingReferences';
import { orders, shopSchema } from '../../../fixtures/shopSchema';

const request = { offset: 0, limit: 100, filters: [] };

describe('validateWhereExpression', () => {
  it.each([
    "status = 'paid'",
    'id > 10 AND customer_id IS NOT NULL',
    `"update" = 'x'`,
    "note = 'please delete; this'",
    "status = 'x' -- comment; with semicolon",
    'id IN (SELECT id FROM orders)',
  ])('accepts %s', (expression) => {
    expect(() => validateWhereExpression('postgres', expression)).not.toThrow();
  });

  it.each(['1 = 1; DROP TABLE orders', 'id = 1; SELECT 2'])('refuses a second statement in %s', (expression) => {
    expect(() => validateWhereExpression('postgres', expression)).toThrow(/single expression/);
  });

  it.each(['id IN (DELETE FROM orders RETURNING id)', 'id IN (SELECT 1 INTO x)', 'update = 1'])('refuses a write in %s', (expression) => {
    expect(() => validateWhereExpression('postgres', expression)).toThrow(/only read data/);
  });

  it('follows the dialect, so a backslash cannot hide a statement', () => {
    expect(() => validateWhereExpression('postgres', `a = 'C:\\'; DROP TABLE t; --'`)).toThrow(/single expression/);
  });
});

describe('buildTablePageQuery with an expression', () => {
  it('wraps the expression in its own lines, so a comment cannot remove the rest', () => {
    const { page } = buildTablePageQuery(orders, 'postgres', { ...request, whereExpression: "status = 'paid' -- only paid" });
    expect(page.sql).toBe(`SELECT * FROM "public"."orders" WHERE (\nstatus = 'paid' -- only paid\n) ORDER BY "id" LIMIT 100 OFFSET 0`);
  });

  it('applies to the count too', () => {
    const { count } = buildTablePageQuery(orders, 'postgres', { ...request, whereExpression: 'id > 1' });
    expect(count.sql).toBe('SELECT COUNT(*) FROM "public"."orders" WHERE (\nid > 1\n)');
  });

  it('combines with column filters, keeping the parameters right', () => {
    const { page } = buildTablePageQuery(orders, 'postgres', { ...request, whereExpression: 'id > 1', filters: [{ column: 'status', operator: 'equals', value: 'paid' }] });
    expect(page.sql).toContain('WHERE (\nid > 1\n) AND "status" = $1');
    expect(page.params).toEqual(['paid']);
  });

  it('ignores a blank expression', () => {
    expect(buildTablePageQuery(orders, 'postgres', { ...request, whereExpression: '   ' }).page.sql).not.toContain('WHERE');
  });

  it('refuses a write before reaching the database', () => {
    expect(() => buildTablePageQuery(orders, 'postgres', { ...request, whereExpression: '1=1; DROP TABLE orders' })).toThrow(/single expression/);
  });
});

describe('buildTableSelect', () => {
  it('selects every matching row, without a limit', () => {
    const statement = buildTableSelect(orders, 'postgres', { filters: [{ column: 'status', operator: 'equals', value: 'paid' }], sort: { column: 'status', isDescending: true } });
    expect(statement.sql).toBe('SELECT * FROM "public"."orders" WHERE "status" = $1 ORDER BY "status" DESC, "id"');
    expect(statement.params).toEqual(['paid']);
  });

  it('selects the whole table with nothing chosen', () => {
    expect(buildTableSelect(orders, 'mysql', { filters: [] }).sql).toBe('SELECT * FROM `public`.`orders` ORDER BY `id`');
  });
});

describe('suggestFilterCompletions', () => {
  const columns = [{ name: 'status', dataType: 'text' }, { name: 'customer_id', dataType: 'integer' }, { name: 'Order Date', dataType: 'date' }, { name: 'user', dataType: 'text' }];
  const suggest = (text: string, cursor = text.length) => suggestFilterCompletions('postgres', text, cursor, columns);
  const labels = (text: string, cursor?: number) => suggest(text, cursor).suggestions.map((suggestion) => suggestion.label);

  it('offers columns before operators', () => {
    expect(labels('').slice(0, 4)).toEqual(['status', 'customer_id', 'Order Date', 'user']);
    expect(labels('')).toContain('IS NULL');
  });

  it('filters by the word under the cursor, ignoring case', () => {
    expect(labels('id > 1 AND ST')).toEqual(['status']);
    expect(labels('is')).toEqual(['IS NULL', 'IS NOT NULL']);
  });

  it('uses the word before the cursor when it is in the middle', () => {
    expect(labels('sta = 1', 2)).toEqual(['status']);
  });

  it('quotes names that need it', () => {
    const insert = (label: string) => suggest('').suggestions.find((item) => item.label === label)?.insertText;
    expect(insert('Order Date')).toBe('"Order Date"');
    expect(insert('user')).toBe('"user"');
    expect(insert('status')).toBe('status');
  });

  it('quotes with the driver of the connection', () => {
    expect(suggestFilterCompletions('mysql', '', 0, columns).suggestions.find((item) => item.label === 'Order Date')?.insertText).toBe('`Order Date`');
  });

  it('replaces the whole word and moves the cursor after it', () => {
    const text = 'id > 1 AND st = 2';
    const completions = suggest(text, 12);
    const result = applyFilterCompletion(text, completions, completions.suggestions[0]);
    expect(result.text).toBe('id > 1 AND status = 2');
    expect(result.cursor).toBe('id > 1 AND status '.length);
  });
});

describe('duplicateRowValues', () => {
  const columns = [
    { name: 'id', isEditable: true, isPrimaryKey: true },
    { name: 'name', isEditable: true, isPrimaryKey: false },
    { name: 'note', isEditable: true, isPrimaryKey: false },
    { name: 'computed', isEditable: false, isPrimaryKey: false },
  ];

  it('copies editable values, including NULL, leaving out the key and generated columns', () => {
    expect(duplicateRowValues(columns, ['1', 'Ana', null, 'x'])).toEqual({ name: 'Ana', note: null });
  });
});

describe('renderTextTable', () => {
  it('aligns the columns', () => {
    expect(renderTextTable(['id', 'name'], [['1', 'Ana'], ['20', null]])).toBe(['id | name', '---+-------', '1  | Ana', '20 | [NULL]'].join('\n'));
  });

  it('keeps each row in one line', () => {
    expect(renderTextTable(['a'], [['one\n  two']]).split('\n')).toHaveLength(3);
  });

  it('shortens very long values', () => {
    const [, , row] = renderTextTable(['a'], [['x'.repeat(200)]]).split('\n');
    expect(row).toHaveLength(80);
    expect(row.endsWith('…')).toBe(true);
  });

  it('works without rows', () => {
    expect(renderTextTable(['id'], []).split('\n')).toEqual(['id', '--']);
  });
});

describe('selectTableNeighborhood', () => {
  const names = (table: string) => selectTableNeighborhood(shopSchema, table).tables.map((candidate) => candidate.name).sort();

  it('keeps the table, what it references and what references it', () => {
    expect(names('orders')).toEqual(['customers', 'order_items', 'orders']);
  });

  it('keeps a table with no relationships alone', () => {
    expect(names('audit_log')).toEqual(['audit_log']);
  });

  it('ignores references to other namespaces', () => {
    expect(names('orders')).not.toContain('warehouses');
  });

  it('returns nothing for an unknown table', () => {
    expect(names('nope')).toEqual([]);
  });
});

describe('findIncomingReferences', () => {
  it('lists the foreign keys that point to the table', () => {
    const references = findIncomingReferences(shopSchema, 'orders');
    expect(references).toEqual([{ name: 'items_order_fkey', table: 'order_items', columns: ['order_id'], referencedColumns: ['id'] }]);
  });

  it('includes self references', () => {
    expect(findIncomingReferences(shopSchema, 'customers').map((reference) => reference.table)).toContain('customers');
  });

  it('returns nothing when no table points to it', () => {
    expect(findIncomingReferences(shopSchema, 'audit_log')).toEqual([]);
  });
});
