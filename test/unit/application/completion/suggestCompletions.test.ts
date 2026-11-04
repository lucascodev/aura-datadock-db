import { describe, expect, it } from 'vitest';
import { parseTableReferences } from '../../../../src/application/completion/suggestions/parseTableReferences';
import { suggestCompletions } from '../../../../src/application/completion/suggestions/suggestCompletions';
import type { NamespaceSchema } from '../../../../src/domain/schema/model/NamespaceSchema';
import { shopSchema } from '../../../fixtures/shopSchema';

const CURSOR = '|';

function suggest(sqlWithCursor: string, schemas: readonly NamespaceSchema[] = [shopSchema], defaultNamespace = 'public') {
  const offset = sqlWithCursor.indexOf(CURSOR);
  const sql = sqlWithCursor.replace(CURSOR, '');
  return suggestCompletions({ sql, offset, kind: 'postgres', schemas, defaultNamespace });
}

const labels = (sqlWithCursor: string) => suggest(sqlWithCursor).map((suggestion) => suggestion.label);

describe('parseTableReferences', () => {
  it('reads aliases with and without AS', () => {
    expect(parseTableReferences('SELECT * FROM orders o JOIN customers AS c ON true')).toEqual([
      { name: 'orders', alias: 'o', namespace: undefined },
      { name: 'customers', alias: 'c', namespace: undefined },
    ]);
  });

  it('reads qualified and quoted names', () => {
    expect(parseTableReferences('SELECT * FROM "public"."Order Items" x')[0]).toEqual({ namespace: 'public', name: 'Order Items', alias: 'x' });
  });

  it('does not take the next keyword as an alias', () => {
    expect(parseTableReferences('SELECT * FROM orders WHERE id = 1')[0].alias).toBeUndefined();
    expect(parseTableReferences('SELECT * FROM orders JOIN customers ON true')[0].alias).toBeUndefined();
  });
});

describe('suggestCompletions', () => {
  it('offers columns after an alias', () => {
    expect(labels('SELECT o.| FROM orders o')).toEqual(['id', 'customer_id', 'status', 'warehouse_id']);
  });

  it('offers columns after a table name', () => {
    expect(labels('SELECT * FROM customers WHERE customers.|')).toContain('email');
  });

  it('resolves an alias in a later join', () => {
    expect(labels('SELECT c.| FROM orders o JOIN customers c ON c.id = o.customer_id')).toContain('referred_by');
  });

  it('keeps the partial word working after a qualifier', () => {
    expect(labels('SELECT o.st| FROM orders o')).toContain('status');
  });

  it('offers columns after namespace.table', () => {
    expect(labels('SELECT public.products.|')).toEqual(['id', 'title']);
  });

  it('offers tables after a namespace', () => {
    expect(labels('SELECT * FROM public.|')).toContain('orders');
  });

  it('offers tables and namespaces after FROM', () => {
    const suggestions = labels('SELECT * FROM |');
    expect(suggestions).toContain('orders');
    expect(suggestions).toContain('public');
    expect(suggestions).not.toContain('SELECT');
  });

  it('offers columns of referenced tables, tables and keywords elsewhere', () => {
    const suggestions = labels('SELECT | FROM products');
    expect(suggestions).toContain('title');
    expect(suggestions).toContain('orders');
    expect(suggestions).toContain('WHERE');
    expect(suggestions.indexOf('title')).toBeLessThan(suggestions.indexOf('WHERE'));
  });

  it('only considers the statement under the cursor', () => {
    const suggestions = labels('SELECT * FROM orders; SELECT | FROM products');
    expect(suggestions).toContain('title');
    expect(suggestions).not.toContain('warehouse_id');
  });

  it('qualifies tables outside the default namespace', () => {
    const logistics: NamespaceSchema = { kind: 'postgres', namespace: 'logistics', tables: [{ namespace: 'logistics', name: 'warehouses', kind: 'table', columns: [], primaryKey: [], foreignKeys: [], indexes: [] }] };
    const suggestion = suggest('SELECT * FROM |', [shopSchema, logistics]).find((item) => item.label === 'warehouses');
    expect(suggestion?.insertText).toBe('logistics.warehouses');
  });

  it('quotes identifiers that need it', () => {
    const schema: NamespaceSchema = {
      kind: 'postgres',
      namespace: 'public',
      tables: ['Order Items', 'user', 'plain'].map((name) => ({ namespace: 'public', name, kind: 'table' as const, columns: [], primaryKey: [], foreignKeys: [], indexes: [] })),
    };
    const inserted = suggest('SELECT * FROM |', [schema]).map((item) => item.insertText);
    expect(inserted).toEqual(expect.arrayContaining(['"Order Items"', '"user"', 'plain']));
  });

  it('returns nothing for an unknown qualifier', () => {
    expect(labels('SELECT nope.|')).toEqual([]);
  });

  it('works on an empty document', () => {
    expect(labels('|')).toContain('SELECT');
  });
});
