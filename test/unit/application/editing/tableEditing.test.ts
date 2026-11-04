import { describe, expect, it } from 'vitest';
import { buildRowChangeStatements } from '../../../../src/application/editing/rows/buildRowChangeStatements';
import { buildAddColumn } from '../../../../src/application/editing/structure/buildAddColumn';
import { buildCreateIndex } from '../../../../src/application/editing/structure/buildCreateIndex';
import { buildCreateTable } from '../../../../src/application/editing/structure/buildCreateTable';
import { buildDropColumn } from '../../../../src/application/editing/structure/buildDropColumn';
import { buildDropTable } from '../../../../src/application/editing/structure/buildDropTable';
import { buildRenameColumn } from '../../../../src/application/editing/structure/buildRenameColumn';
import { buildRenameTable } from '../../../../src/application/editing/structure/buildRenameTable';
import { buildTruncateTable } from '../../../../src/application/editing/structure/buildTruncateTable';
import { buildTablePageQuery } from '../../../../src/application/editing/tableQuery/buildTablePageQuery';
import { describeEditability } from '../../../../src/application/editing/rows/describeEditability';
import { isColumnEditable } from '../../../../src/application/editing/rows/isColumnEditable';
import { addInsert } from '../../../../src/application/editing/pendingInserts/addInsert';
import { clearInsertValue } from '../../../../src/application/editing/pendingInserts/clearInsertValue';
import { editCell } from '../../../../src/application/editing/pendingUpdates/editCell';
import { editInsert } from '../../../../src/application/editing/pendingInserts/editInsert';
import { findUpdate } from '../../../../src/application/editing/pendingUpdates/findUpdate';
import { isMarkedForDeletion } from '../../../../src/application/editing/pendingUpdates/isMarkedForDeletion';
import { removeInsert } from '../../../../src/application/editing/pendingInserts/removeInsert';
import { rowKeyId } from '../../../../src/application/editing/pendingUpdates/rowKeyId';
import { toggleDeletion } from '../../../../src/application/editing/pendingUpdates/toggleDeletion';
import type { TableDefinition } from '../../../../src/domain/schema/model/TableDefinition';
import { assertExpectedRows } from '../../../../src/domain/database/rules/assertExpectedRows';
import { auditLog, customers, orderItems, orders, paidOrders } from '../../../fixtures/shopSchema';

const key = { id: '1' };

describe('pendingChanges', () => {
  it('records an edit and merges later edits of the same row', () => {
    const first = editCell([], key, 'name', 'Ana', 'old');
    const second = editCell(first, key, 'email', 'a@b.c', null);
    expect(second).toEqual([{ type: 'update', key, values: { name: 'Ana', email: 'a@b.c' } }]);
  });

  it('forgets an edit that goes back to the original value', () => {
    const edited = editCell([], key, 'name', 'Ana', 'old');
    expect(editCell(edited, key, 'name', 'old', 'old')).toEqual([]);
  });

  it('treats NULL and an empty string as different values', () => {
    expect(editCell([], key, 'name', '', null)).toHaveLength(1);
    expect(editCell([], key, 'name', null, null)).toEqual([]);
  });

  it('keeps edits of other rows', () => {
    const changes = editCell(editCell([], key, 'name', 'A', 'x'), { id: '2' }, 'name', 'B', 'x');
    expect(changes).toHaveLength(2);
    expect(findUpdate(changes, { id: '2' })?.values.name).toBe('B');
  });

  it('replaces the edits of a row when it is deleted, and undoes the deletion', () => {
    const edited = editCell([], key, 'name', 'A', 'x');
    const deleted = toggleDeletion(edited, key);
    expect(deleted).toEqual([{ type: 'delete', key }]);
    expect(isMarkedForDeletion(deleted, key)).toBe(true);
    expect(toggleDeletion(deleted, key)).toEqual([]);
  });

  it('adds, fills, clears and removes new rows', () => {
    const added = addInsert([], 'new-1');
    const filled = editInsert(added, 'new-1', 'name', 'Ana');
    expect(filled).toEqual([{ type: 'insert', id: 'new-1', values: { name: 'Ana' } }]);
    expect(clearInsertValue(filled, 'new-1', 'name')).toEqual(added);
    expect(removeInsert(filled, 'new-1')).toEqual([]);
  });

  it('identifies a composite key regardless of the order of its columns', () => {
    expect(rowKeyId({ a: '1', b: '2' })).toBe(rowKeyId({ b: '2', a: '1' }));
  });

  it('does not change the list it receives', () => {
    const changes = Object.freeze(addInsert([], 'new-1'));
    expect(() => editInsert(changes, 'new-1', 'name', 'x')).not.toThrow();
    expect(changes).toEqual([{ type: 'insert', id: 'new-1', values: {} }]);
  });
});

describe('describeEditability', () => {
  it('allows everything on a table with a primary key', () => {
    expect(describeEditability(customers, 'postgres', false)).toEqual({ canInsert: true, canUpdate: true, canDelete: true });
  });

  it('allows nothing on a read-only connection', () => {
    expect(describeEditability(customers, 'postgres', true)).toMatchObject({ canInsert: false, canUpdate: false, canDelete: false, notice: expect.stringContaining('read-only') });
  });

  it('allows nothing on a view', () => {
    expect(describeEditability(paidOrders, 'postgres', false)).toMatchObject({ canInsert: false, canUpdate: false, notice: expect.stringContaining('view') });
  });

  it('allows only inserts without a primary key, and says why', () => {
    expect(describeEditability(auditLog, 'postgres', false)).toMatchObject({ canInsert: true, canUpdate: false, canDelete: false, notice: expect.stringContaining('primary key') });
  });

  it('allows only inserts when the key has a binary column', () => {
    const binaryKey: TableDefinition = { ...customers, primaryKey: ['id'], columns: [{ name: 'id', dataType: 'bytea', nullable: false, isPrimaryKey: true }] };
    expect(describeEditability(binaryKey, 'postgres', false).canUpdate).toBe(false);
  });
});

describe('isColumnEditable', () => {
  const column = { name: 'c', dataType: 'text', nullable: true, isPrimaryKey: false };

  it.each([
    ['a plain column', column, true],
    ['identity by default', { ...column, generationClause: 'GENERATED BY DEFAULT AS IDENTITY' }, true],
    ['auto increment', { ...column, generationClause: 'AUTO_INCREMENT' }, true],
    ['identity always', { ...column, generationClause: 'GENERATED ALWAYS AS IDENTITY' }, false],
    ['a computed column', { ...column, isComputed: true }, false],
    ['a binary column', { ...column, dataType: 'bytea' }, false],
  ])('for %s', (_label, candidate, expected) => {
    expect(isColumnEditable(candidate, 'postgres')).toBe(expected);
  });

  it('knows the binary types of MySQL', () => {
    for (const dataType of ['blob', 'longblob', 'varbinary(16)', 'binary(16)']) {
      expect(isColumnEditable({ ...column, dataType }, 'mysql'), dataType).toBe(false);
    }
    expect(isColumnEditable({ ...column, dataType: 'varchar(20)' }, 'mysql')).toBe(true);
  });
});

describe('buildRowChangeStatements', () => {
  const editable = orders;

  it('builds an update with parameters, identified by the primary key', () => {
    const [statement] = buildRowChangeStatements(editable, 'postgres', false, [{ type: 'update', key: { id: '7' }, values: { status: 'paid' } }]);
    expect(statement.sql).toBe('UPDATE "public"."orders" SET "status" = $1 WHERE "id" = $2');
    expect(statement.params).toEqual(['paid', '7']);
    expect(statement.expectedRows).toBe(1);
  });

  it('uses the placeholder and quote of the driver', () => {
    const [statement] = buildRowChangeStatements(editable, 'mysql', false, [{ type: 'update', key: { id: '7' }, values: { status: 'paid' } }]);
    expect(statement.sql).toBe('UPDATE `public`.`orders` SET `status` = ? WHERE `id` = ?');
  });

  it('identifies composite keys with every column', () => {
    const [statement] = buildRowChangeStatements(orderItems, 'postgres', false, [{ type: 'delete', key: { order_id: '1', product_id: '2' } }]);
    expect(statement.sql).toBe('DELETE FROM "public"."order_items" WHERE "order_id" = $1 AND "product_id" = $2');
    expect(statement.params).toEqual(['1', '2']);
  });

  it('refuses a key with a column missing', () => {
    expect(() => buildRowChangeStatements(orderItems, 'postgres', false, [{ type: 'delete', key: { order_id: '1' } }])).toThrow(/primary key column product_id/);
  });

  it('sends NULL as a parameter', () => {
    const [statement] = buildRowChangeStatements(editable, 'postgres', false, [{ type: 'update', key: { id: '1' }, values: { customer_id: null } }]);
    expect(statement.params).toEqual([null, '1']);
    expect(statement.preview).toContain('"customer_id" = NULL');
  });

  it('never places a value in the SQL, so it cannot inject anything', () => {
    const attack = "'; DROP TABLE orders; --";
    const [statement] = buildRowChangeStatements(editable, 'postgres', false, [{ type: 'update', key: { id: attack }, values: { status: attack } }]);
    expect(statement.sql).not.toContain('DROP');
    expect(statement.params).toEqual([attack, attack]);
  });

  it('escapes the preview, which is only for reading', () => {
    const [statement] = buildRowChangeStatements(editable, 'postgres', false, [{ type: 'update', key: { id: '1' }, values: { status: "it's" } }]);
    expect(statement.preview).toContain("'it''s'");
  });

  it('builds inserts, leaving out columns without a value so the default applies', () => {
    const [statement] = buildRowChangeStatements(editable, 'postgres', false, [{ type: 'insert', id: 'n', values: { status: 'new' } }]);
    expect(statement.sql).toBe('INSERT INTO "public"."orders" ("status") VALUES ($1)');
  });

  it.each([
    ['postgres', 'INSERT INTO "public"."orders" DEFAULT VALUES'],
    ['mysql', 'INSERT INTO `public`.`orders` () VALUES ()'],
  ])('builds an insert of only defaults on %s', (kind, expected) => {
    const [statement] = buildRowChangeStatements(editable, kind, false, [{ type: 'insert', id: 'n', values: {} }]);
    expect(statement.sql).toBe(expected);
  });

  it('runs deletes first and inserts last, so a replaced key does not collide', () => {
    const statements = buildRowChangeStatements(editable, 'postgres', false, [
      { type: 'insert', id: 'n', values: { status: 'x' } },
      { type: 'update', key: { id: '2' }, values: { status: 'y' } },
      { type: 'delete', key: { id: '3' } },
    ]);
    expect(statements.map((statement) => statement.sql.split(' ')[0])).toEqual(['DELETE', 'UPDATE', 'INSERT']);
  });

  it('refuses unknown and protected columns, even if the webview sends them', () => {
    expect(() => buildRowChangeStatements(editable, 'postgres', false, [{ type: 'update', key: { id: '1' }, values: { nope: 'x' } }])).toThrow(/does not exist/);
    const protectedColumn: TableDefinition = { ...orders, columns: [...orders.columns, { name: 'total', dataType: 'numeric', nullable: true, isPrimaryKey: false, isComputed: true }] };
    expect(() => buildRowChangeStatements(protectedColumn, 'postgres', false, [{ type: 'insert', id: 'n', values: { total: '1' } }])).toThrow(/cannot be changed/);
  });

  it('refuses what the table does not allow, even if the webview sends it', () => {
    expect(() => buildRowChangeStatements(auditLog, 'postgres', false, [{ type: 'delete', key: { entry: 'x' } }])).toThrow(/primary key/);
    expect(() => buildRowChangeStatements(customers, 'postgres', true, [{ type: 'insert', id: 'n', values: {} }])).toThrow(/read-only/);
    expect(() => buildRowChangeStatements(paidOrders, 'postgres', false, [{ type: 'insert', id: 'n', values: {} }])).toThrow(/view/);
  });
});

describe('assertExpectedRows', () => {
  const statement = { sql: 'x', params: [], preview: 'UPDATE t', expectedRows: 1 };

  it('accepts the expected count', () => {
    expect(() => assertExpectedRows(statement, 1)).not.toThrow();
  });

  it('refuses a row that no longer exists, and shows the statement', () => {
    expect(() => assertExpectedRows(statement, 0)).toThrow(/Nothing was saved.*UPDATE t/);
  });

  it('ignores statements with no expectation', () => {
    expect(() => assertExpectedRows({ ...statement, expectedRows: undefined }, 99)).not.toThrow();
  });
});

describe('buildTablePageQuery', () => {
  const request = { offset: 0, limit: 100, filters: [] };

  it('pages in a stable order by the primary key', () => {
    const { page, count } = buildTablePageQuery(orders, 'postgres', { ...request, offset: 200 });
    expect(page.sql).toBe('SELECT * FROM "public"."orders" ORDER BY "id" LIMIT 100 OFFSET 200');
    expect(count.sql).toBe('SELECT COUNT(*) FROM "public"."orders"');
  });

  it('sorts by the chosen column, keeping the key as a tie breaker', () => {
    const { page } = buildTablePageQuery(orders, 'postgres', { ...request, sort: { column: 'status', isDescending: true } });
    expect(page.sql).toContain('ORDER BY "status" DESC, "id" LIMIT');
  });

  it('does not repeat the key when sorting by it', () => {
    const { page } = buildTablePageQuery(orders, 'postgres', { ...request, sort: { column: 'id', isDescending: false } });
    expect(page.sql).toContain('ORDER BY "id" ASC LIMIT');
  });

  it('has no order without a key or a sort', () => {
    expect(buildTablePageQuery(auditLog, 'postgres', request).page.sql).not.toContain('ORDER BY');
  });

  it('applies filters with parameters, in the page and in the count', () => {
    const { page, count } = buildTablePageQuery(orders, 'postgres', {
      ...request,
      filters: [{ column: 'status', operator: 'equals', value: 'paid' }, { column: 'customer_id', operator: 'isNotNull', value: '' }],
    });
    expect(page.sql).toContain('WHERE "status" = $1 AND "customer_id" IS NOT NULL ORDER BY');
    expect(page.params).toEqual(['paid']);
    expect(count.sql).toBe('SELECT COUNT(*) FROM "public"."orders" WHERE "status" = $1 AND "customer_id" IS NOT NULL');
    expect(count.params).toEqual(['paid']);
  });

  it.each([
    ['postgres', 'CAST("status" AS TEXT) ILIKE $1'],
    ['mysql', 'CAST(`status` AS CHAR) LIKE ?'],
  ])('searches text on %s', (kind, expected) => {
    const { page } = buildTablePageQuery(orders, kind, { ...request, filters: [{ column: 'status', operator: 'contains', value: 'pa' }] });
    expect(page.sql).toContain(expected);
    expect(page.params).toEqual(['%pa%']);
  });

  it('escapes wildcards typed in a search', () => {
    const { page } = buildTablePageQuery(orders, 'postgres', { ...request, filters: [{ column: 'status', operator: 'startsWith', value: '50%_a\\' }] });
    expect(page.params).toEqual(['50\\%\\_a\\\\%']);
  });

  it('refuses unknown columns, so a column name cannot inject anything', () => {
    expect(() => buildTablePageQuery(orders, 'postgres', { ...request, filters: [{ column: 'x" OR 1=1 --', operator: 'isNull', value: '' }] })).toThrow(/does not exist/);
    expect(() => buildTablePageQuery(orders, 'postgres', { ...request, sort: { column: 'nope', isDescending: false } })).toThrow(/does not exist/);
  });

  it.each([
    [-1, 100],
    [0, 0],
    [1.5, 100],
    [0, Number.NaN],
  ])('refuses the window offset %s, limit %s', (offset, limit) => {
    expect(() => buildTablePageQuery(orders, 'postgres', { ...request, offset, limit })).toThrow(/Invalid page/);
  });
});

describe('buildStructureChange', () => {
  const table = { namespace: 'shop', name: 'orders' };

  it('creates a table with the auto increment of each driver', () => {
    expect(buildCreateTable('postgres', table)).toContain('"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY');
    expect(buildCreateTable('mysql', table)).toContain('`id` bigint AUTO_INCREMENT PRIMARY KEY');
  });

  it('adds a column', () => {
    expect(buildAddColumn('postgres', table, { name: 'note', dataType: 'text', isNullable: true })).toBe('ALTER TABLE "shop"."orders" ADD COLUMN "note" text;');
    expect(buildAddColumn('mysql', table, { name: 'note', dataType: 'text', isNullable: false })).toBe('ALTER TABLE `shop`.`orders` ADD COLUMN `note` text NOT NULL;');
  });

  it('renames a table with the syntax of each driver', () => {
    expect(buildRenameTable('postgres', table, 'sales')).toBe('ALTER TABLE "shop"."orders" RENAME TO "sales";');
    expect(buildRenameTable('mariadb', table, 'sales')).toBe('RENAME TABLE `shop`.`orders` TO `shop`.`sales`;');
  });

  it('builds the remaining statements', () => {
    expect(buildTruncateTable('postgres', table)).toBe('TRUNCATE TABLE "shop"."orders";');
    expect(buildDropTable('postgres', table, 'table')).toBe('DROP TABLE "shop"."orders";');
    expect(buildDropTable('postgres', table, 'view')).toBe('DROP VIEW "shop"."orders";');
    expect(buildRenameColumn('postgres', table, 'a', 'b')).toBe('ALTER TABLE "shop"."orders" RENAME COLUMN "a" TO "b";');
    expect(buildDropColumn('mysql', table, 'a')).toBe('ALTER TABLE `shop`.`orders` DROP COLUMN `a`;');
    expect(buildCreateIndex('postgres', table, 'a')).toBe('CREATE INDEX "orders_a_idx" ON "shop"."orders" ("a");');
  });

  it('quotes names, so a typed name cannot break the statement', () => {
    expect(buildRenameColumn('postgres', table, 'a', 'b"; DROP TABLE x; --')).toContain('"b""; DROP TABLE x; --"');
  });
});
