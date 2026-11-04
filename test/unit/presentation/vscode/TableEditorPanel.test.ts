import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RowChange } from '../../../../src/application/editing/rows/RowChange';
import type { ConnectionTarget } from '../../../../src/domain/connection/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../src/domain/database/DatabaseAdapter';
import { TableEditors } from '../../../../src/presentation/vscode/panels/table/TableEditors';
import type { TableEditorDependencies } from '../../../../src/presentation/vscode/panels/table/TableEditorPanel';
import { createdPanels, Uri, window, type FakeWebviewPanel } from '../../../fixtures/vscodeStub';
import { auditLog, orders, shopSchema } from '../../../fixtures/shopSchema';

const localTarget: ConnectionTarget = {
  id: 't1',
  key: 'saved:t1',
  name: 'db',
  detail: 'localhost',
  source: 'saved',
  kind: 'postgres',
  host: 'localhost',
  port: 5432,
  user: 'u',
  password: 'p',
  credentialSource: 'secret-storage',
  isRemote: false,
  isReadOnly: false,
  tls: { mode: 'off' },
};

const remoteTarget: ConnectionTarget = { ...localTarget, isRemote: true };
const update: RowChange = { type: 'update', key: { id: '1' }, values: { status: 'paid' } };
const deletion: RowChange = { type: 'delete', key: { id: '2' } };
const request = { offset: 0, limit: 100, filters: [] };

function createAdapterFake() {
  return {
    queryPage: vi.fn(async (statement: { sql: string }) =>
      statement.sql.startsWith('SELECT COUNT')
        ? { columns: ['count'], rows: [['42']], truncated: false, durationMs: 1 }
        : { columns: ['id', 'status'], rows: [[1, null], [2, { nested: true }]], truncated: false, durationMs: 3 },
    ),
    applyStatements: vi.fn(async () => 1),
  };
}

function setup(overrides: Partial<TableEditorDependencies> = {}, table = orders) {
  const adapter = createAdapterFake();
  const dependencies: TableEditorDependencies = {
    extensionUri: Uri as never,
    getAdapter: async () => adapter as unknown as DatabaseAdapter,
    loadSchema: async () => ({ kind: 'postgres', namespace: 'public', tables: [table] }),
    isReadOnly: () => false,
    confirmsDestructive: () => true,
    pageSize: () => 100,
    openSql: vi.fn(async () => undefined),
    runScript: vi.fn(async () => true),
    exportRows: vi.fn(async () => undefined),
    openTable: vi.fn(async () => undefined),
    copyText: vi.fn(async () => undefined),
    recordHistory: vi.fn(async () => undefined),
    log: vi.fn(),
    ...overrides,
  };
  return { adapter, dependencies, editors: new TableEditors(dependencies) };
}

function currentPanel(): FakeWebviewPanel {
  return createdPanels[createdPanels.length - 1];
}

const messagesOf = (type: string) => currentPanel().posted.filter((message) => (message as { type: string }).type === type);

async function waitForCount(): Promise<void> {
  await vi.waitFor(() => expect(messagesOf('count').length).toBeGreaterThan(0));
}

describe('TableEditorPanel', () => {
  beforeEach(() => {
    createdPanels.length = 0;
    window.showWarningMessage.mockReset();
  });

  describe('opening', () => {
    it('describes the table to the webview', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'ready' });

      expect(currentPanel().title).toBe('orders · db');
      expect(messagesOf('init')[0]).toMatchObject({
        title: 'public.orders',
        primaryKey: ['id'],
        pageSize: 100,
        editability: { canInsert: true, canUpdate: true, canDelete: true },
      });
    });

    it('marks what the columns allow', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'ready' });

      const { columns } = messagesOf('init')[0] as { columns: { name: string; isPrimaryKey: boolean; isForeignKey: boolean; hasDefault: boolean }[] };
      expect(columns.find((column) => column.name === 'id')).toMatchObject({ isPrimaryKey: true, hasDefault: true });
      expect(columns.find((column) => column.name === 'customer_id')).toMatchObject({ isForeignKey: true, hasDefault: false });
    });

    it('turns editing off on a read-only connection', async () => {
      const { editors } = setup({ isReadOnly: () => true });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'ready' });
      expect(messagesOf('init')[0]).toMatchObject({ editability: { canInsert: false, canUpdate: false, notice: expect.stringContaining('read-only') } });
    });

    it('explains a table without a primary key', async () => {
      const { editors } = setup({}, auditLog);
      await editors.show(localTarget, auditLog);
      await currentPanel().receive({ type: 'ready' });
      expect(messagesOf('init')[0]).toMatchObject({ editability: { canUpdate: false, notice: expect.stringContaining('primary key') } });
    });

    it('asks to add a row when opened by Add Row', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders, { shouldAddRow: true });
      await currentPanel().receive({ type: 'ready' });
      expect(messagesOf('init')[0]).toMatchObject({ shouldAddRow: true });
    });

    it('reuses the open panel of a table', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await editors.show(localTarget, orders);
      expect(createdPanels).toHaveLength(1);
    });

    it('opens another panel for another connection', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await editors.show({ ...localTarget, id: 't2', name: 'other' }, orders);
      expect(createdPanels).toHaveLength(2);
    });
  });

  describe('loading rows', () => {
    it('sends the rows as text, keeping NULL apart, and then the total', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'loadPage', request });
      await waitForCount();

      expect(messagesOf('page')[0]).toMatchObject({ rows: [['1', null], ['2', '{"nested":true}']], durationMs: 3 });
      expect(messagesOf('count')[0]).toEqual({ type: 'count', total: 42 });
    });

    it('shows a failure in the panel', async () => {
      const { adapter, editors } = setup();
      adapter.queryPage.mockRejectedValue(new Error('connection lost'));
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'loadPage', request });
      expect(messagesOf('failed')).toEqual([{ type: 'failed', message: 'connection lost' }]);
    });

    it('still shows the rows when only the total fails', async () => {
      const { adapter, dependencies, editors } = setup();
      const original = adapter.queryPage.getMockImplementation();
      adapter.queryPage.mockImplementation(async (statement) => {
        if (statement.sql.startsWith('SELECT COUNT')) {
          throw new Error('too slow');
        }
        return (original as NonNullable<typeof original>)(statement);
      });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'loadPage', request });
      await vi.waitFor(() => expect(dependencies.log).toHaveBeenCalledWith(expect.stringContaining('too slow')));
      expect(messagesOf('page')).toHaveLength(1);
      expect(messagesOf('failed')).toEqual([]);
    });

    it('sends the table again when its columns changed', async () => {
      let table = orders;
      const { editors } = setup({ loadSchema: async () => ({ kind: 'postgres', namespace: 'public', tables: [table] }) });
      await editors.show(localTarget, orders);
      table = { ...orders, columns: orders.columns.slice(0, 2) };
      await currentPanel().receive({ type: 'loadPage', request });
      expect(messagesOf('init')).toHaveLength(1);
    });
  });

  describe('saving', () => {
    it('applies the changes, reports the result and records them in the history', async () => {
      const { adapter, dependencies, editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'pendingChanged', changes: [update] });
      expect(currentPanel().title).toBe('● orders · db');

      await currentPanel().receive({ type: 'save', changes: [update] });

      expect(adapter.applyStatements).toHaveBeenCalledTimes(1);
      expect(messagesOf('saved')).toEqual([{ type: 'saved', affectedRows: 1 }]);
      expect(currentPanel().title).toBe('orders · db');
      expect(dependencies.recordHistory).toHaveBeenCalledWith(expect.objectContaining({ connectionKey: 'saved:t1', sql: expect.stringContaining('UPDATE') }));
    });

    it('does not ask to confirm a plain edit on a local database', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'save', changes: [update] });
      expect(window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('asks to confirm a deletion, and does nothing if refused', async () => {
      const { adapter, editors } = setup();
      window.showWarningMessage.mockResolvedValue(undefined);
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'save', changes: [deletion] });

      expect(window.showWarningMessage).toHaveBeenCalledTimes(1);
      expect(adapter.applyStatements).not.toHaveBeenCalled();
      expect(messagesOf('saved')).toEqual([]);
    });

    it('saves a deletion after confirmation', async () => {
      const { adapter, editors } = setup();
      window.showWarningMessage.mockResolvedValue('Save Changes');
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'save', changes: [deletion] });
      expect(adapter.applyStatements).toHaveBeenCalledTimes(1);
    });

    it('asks to confirm any change on a remote database, saying it is remote', async () => {
      const { editors } = setup();
      window.showWarningMessage.mockResolvedValue(undefined);
      await editors.show(remoteTarget, orders);
      await currentPanel().receive({ type: 'save', changes: [update] });

      const [, options] = window.showWarningMessage.mock.calls[0] as [string, { modal: boolean; detail: string }];
      expect(options.modal).toBe(true);
      expect(options.detail).toContain('remote database');
      expect(options.detail).toContain('1 to change');
    });

    it('refuses to save on a read-only connection, even if the webview tries', async () => {
      const { adapter, editors } = setup({ isReadOnly: () => true });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'save', changes: [update] });

      expect(adapter.applyStatements).not.toHaveBeenCalled();
      expect(messagesOf('failed')[0]).toMatchObject({ message: expect.stringContaining('read-only') });
    });

    it('keeps the pending changes and shows the error when saving fails', async () => {
      const { adapter, editors } = setup();
      adapter.applyStatements.mockRejectedValue(new Error('duplicate key'));
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'pendingChanged', changes: [update] });
      await currentPanel().receive({ type: 'save', changes: [update] });

      expect(messagesOf('failed')).toEqual([{ type: 'failed', message: 'duplicate key' }]);
      expect(currentPanel().title).toBe('● orders · db');
    });
  });

  it('opens the SQL of the pending changes for reading, without running it', async () => {
    const { adapter, dependencies, editors } = setup();
    await editors.show(localTarget, orders);
    await currentPanel().receive({ type: 'preview', changes: [update] });

    expect(dependencies.openSql).toHaveBeenCalledWith(localTarget, expect.stringContaining(`SET "status" = 'paid'`));
    expect(adapter.applyStatements).not.toHaveBeenCalled();
  });

  describe('running SQL from the panel below the rows', () => {
    it('shows a single read in the grid, without touching the results panel', async () => {
      const { adapter, dependencies, editors } = setup();
      const runQuery = vi.fn(async () => ({ columns: ['n'], rows: [[1], [null]], truncated: true, durationMs: 2 }));
      Object.assign(adapter, { runQuery });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'runSql', sql: '-- note\nSELECT 1 AS n;', limit: 50 });

      expect(runQuery).toHaveBeenCalledWith('SELECT 1 AS n', 50);
      expect(dependencies.runScript).not.toHaveBeenCalled();
      expect(messagesOf('customResult')[0]).toEqual({ type: 'customResult', result: { sql: 'SELECT 1 AS n', columns: ['n'], rows: [['1'], [null]], isTruncated: true, durationMs: 2 } });
    });

    it.each(['DELETE FROM orders WHERE id = 1', 'SELECT 1; SELECT 2', 'DROP TABLE orders'])('sends %s through the protected route', async (sql) => {
      const { dependencies, editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'runSql', sql, limit: 50 });

      expect(dependencies.runScript).toHaveBeenCalledWith(localTarget, sql);
      expect(messagesOf('scriptFinished')).toHaveLength(1);
    });

    it('does not claim that SQL ran when the person declined it', async () => {
      const { dependencies, editors } = setup();
      vi.mocked(dependencies.runScript).mockResolvedValue(false);
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'runSql', sql: 'DROP TABLE orders', limit: 50 });

      expect(messagesOf('scriptFinished')).toEqual([]);
      expect(messagesOf('failed')).toEqual([{ type: 'failed', message: '' }]);
    });

    it('shows a failure', async () => {
      const { adapter, editors } = setup();
      Object.assign(adapter, { runQuery: vi.fn(async () => { throw new Error('syntax error'); }) });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'runSql', sql: 'SELECT nope', limit: 50 });
      expect(messagesOf('failed')).toEqual([{ type: 'failed', message: 'syntax error' }]);
    });
  });

  describe('the screen', () => {
    it('describes the properties, the DDL and the neighbors of the table', async () => {
      const { editors } = setup({ loadSchema: async () => ({ ...shopSchema }) });
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'ready' });

      const { properties } = messagesOf('init')[0] as { properties: { incomingReferences: { table: string }[]; ddl: string; diagramSchema: { tables: { name: string }[] } } };
      expect(properties.incomingReferences.map((reference) => reference.table)).toEqual(['order_items']);
      expect(properties.ddl).toContain('CREATE TABLE "public"."orders"');
      expect(properties.ddl).not.toContain('"products"');
      expect(properties.diagramSchema.tables.map((table) => table.name).sort()).toEqual(['customers', 'order_items', 'orders']);
    });

    it('sends the SQL of each page', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'loadPage', request: { ...request, filters: [{ column: 'status', operator: 'equals', value: "it's" }] } });
      expect((messagesOf('page')[0] as { sql: string }).sql).toContain("\"status\" = 'it''s'");
    });

    it('shows a refused expression instead of running it', async () => {
      const { adapter, editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'loadPage', request: { ...request, whereExpression: '1=1; DROP TABLE orders' } });
      expect(adapter.queryPage).not.toHaveBeenCalled();
      expect(messagesOf('failed')[0]).toMatchObject({ message: expect.stringContaining('single expression') });
    });

    it('exports what is filtered', async () => {
      const { dependencies, editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'exportData', selection: { filters: [{ column: 'status', operator: 'equals', value: 'paid' }] } });
      const [, , statement] = vi.mocked(dependencies.exportRows).mock.calls[0];
      expect(statement.sql).toContain('WHERE "status" = $1');
      expect(statement.sql).not.toContain('LIMIT');
    });

    it('opens a related table, copies and opens SQL', async () => {
      const { dependencies, editors } = setup();
      await editors.show(localTarget, orders);
      await currentPanel().receive({ type: 'openTable', table: 'customers' });
      await currentPanel().receive({ type: 'copyText', text: 'x' });
      await currentPanel().receive({ type: 'openSql', sql: 'SELECT 1' });

      expect(dependencies.openTable).toHaveBeenCalledWith(localTarget, { namespace: 'public', name: 'customers' });
      expect(dependencies.copyText).toHaveBeenCalledWith('x');
      expect(dependencies.openSql).toHaveBeenCalledWith(localTarget, 'SELECT 1\n');
    });
  });

  describe('closing with unsaved changes', () => {
    it('offers to reopen, and restores the changes', async () => {
      const { editors } = setup();
      window.showWarningMessage.mockResolvedValue('Reopen');
      await editors.show(localTarget, orders);
      const first = currentPanel();
      await first.receive({ type: 'pendingChanged', changes: [update] });

      first.close();
      await vi.waitFor(() => expect(createdPanels).toHaveLength(2));
      await currentPanel().receive({ type: 'ready' });

      expect(window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('1 unsaved change'), 'Reopen');
      expect(messagesOf('init')[0]).toMatchObject({ changes: [update] });
    });

    it('says nothing when there is nothing to lose', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      currentPanel().close();
      await Promise.resolve();
      expect(window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('opens a new panel after closing the old one', async () => {
      const { editors } = setup();
      await editors.show(localTarget, orders);
      currentPanel().close();
      await editors.show(localTarget, orders);
      expect(createdPanels).toHaveLength(2);
    });
  });
});
