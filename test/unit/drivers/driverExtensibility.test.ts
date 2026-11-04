import { describe, expect, it, vi } from 'vitest';
import { createAdapter } from '../../../src/infrastructure/database/factory/createAdapter';
import { parseConnectionString } from '../../../src/application/connections/saved/parseConnectionString';
import { SavedConnections } from '../../../src/application/connections/saved/SavedConnections';
import { buildRowChangeStatements } from '../../../src/application/editing/rows/buildRowChangeStatements';
import { buildTablePageQuery } from '../../../src/application/editing/browsing/buildTablePageQuery';
import { buildRenameTable } from '../../../src/application/editing/structure/buildStructureChange';
import { toSqlLiteral } from '../../../src/application/sql/building/toSqlLiteral';
import { renderDdl } from '../../../src/application/schema/rendering/renderDdl';
import { chooseDefaultNamespace } from '../../../src/application/schema/loading/chooseDefaultNamespace';
import { scanStatements } from '../../../src/application/query/analysis/splitStatements';
import { suggestCompletions } from '../../../src/application/completion/suggestions/suggestCompletions';
import { detectDatabaseKind } from '../../../src/infrastructure/docker/discovery/detectDatabaseKind';
import { resolveCredentials } from '../../../src/infrastructure/docker/discovery/resolveCredentials';
import { listDrivers } from '../../../src/drivers/catalog/driverCatalog';
import type { ConnectionTarget } from '../../../src/domain/connection/model/ConnectionTarget';
import type { DriverDescriptor } from '../../../src/domain/driver/model/DriverDescriptor';
import type { SavedConnection } from '../../../src/domain/connection/model/SavedConnection';
import { shopSchema, orders } from '../../fixtures/shopSchema';

const { FAKE_ADAPTER, fakeDriver } = vi.hoisted(() => {
  const fakeDriver: DriverDescriptor = {
    id: 'fakedb',
    label: 'FakeDB',
    defaultPort: 7777,
    connectionSchemes: ['fakedb'],
    defaultNamespace: 'main',
    dialect: {
      identifierQuote: '~',
      plainIdentifier: /^[a-z]+$/,
      hasHashComments: false,
      hasConditionalComments: false,
      serverSideFunctions: [],
      hasDollarQuotes: false,
      backslashEscapes: 'escape-strings-only',
      stringLiteralEscapesBackslash: false,
      assistantName: 'FakeDB',
      commonTypes: ['text'],
      autoIncrementPrimaryKey: 'serial',
      insertAllDefaults: 'DEFAULT VALUES',
      caseInsensitiveLike: 'LIKE',
      placeholder: (position) => `@p${position}`,
      binaryLiteral: (hex) => `0x${hex}`,
      castToText: (column) => `TEXT(${column})`,
      isBinaryType: (dataType) => dataType === 'raw',
      renameTable: (table, _namespace, newName) => `RENAME ${table} AS ${newName}`,
    },
    docker: {
      imagePatterns: [/(^|\/)fakedb/i],
      resolveCredentials: (env) => ({ user: env.FAKE_USER ?? 'admin', password: env.FAKE_PASSWORD }),
    },
  };
  return { FAKE_ADAPTER: { name: 'fake adapter' }, fakeDriver };
});

vi.mock('../../../src/drivers/catalog/driverDescriptors', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/drivers/catalog/driverDescriptors')>();
  return { DRIVER_DESCRIPTORS: [...original.DRIVER_DESCRIPTORS, fakeDriver] };
});

vi.mock('../../../src/infrastructure/database/factory/adapterFactories', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/infrastructure/database/factory/adapterFactories')>();
  return { ADAPTER_FACTORIES: { ...original.ADAPTER_FACTORIES, fakedb: () => FAKE_ADAPTER } };
});

describe('adding a driver only through its description and adapter', () => {
  it('appears in the list used by the connection form', () => {
    expect(listDrivers().map((driver) => driver.label)).toContain('FakeDB');
  });

  it('opens its adapter', () => {
    expect(createAdapter({ kind: 'fakedb' } as ConnectionTarget)).toBe(FAKE_ADAPTER);
  });

  it('is accepted in saved connections', async () => {
    const saved: SavedConnection = { id: '1', name: 'fake', kind: 'fakedb', host: 'h', port: 7777, user: 'u', tlsMode: 'off', isReadOnly: false };
    const connections = new SavedConnections({ read: () => [saved], write: async () => undefined });
    await expect(connections.discover()).resolves.toHaveLength(1);
  });

  it('understands its connection string, with its default port', () => {
    expect(parseConnectionString('fakedb://u:p@host/data')).toMatchObject({ kind: 'fakedb', port: '7777' });
  });

  it('is discovered in Docker, with its credentials', () => {
    expect(detectDatabaseKind('acme/fakedb:1')).toBe('fakedb');
    expect(resolveCredentials('fakedb', { FAKE_PASSWORD: 'x' })).toEqual({ user: 'admin', password: 'x' });
  });

  it('chooses its default namespace', () => {
    expect(chooseDefaultNamespace('fakedb', 'other', ['other', 'main'])).toBe('main');
  });

  it('follows its SQL rules in the scanner', () => {
    expect(scanStatements(`SELECT a # b; SELECT 2`, 'fakedb')).toHaveLength(2);
  });

  it('writes literals, DDL and suggestions in its dialect', () => {
    expect(toSqlLiteral('fakedb', Buffer.from([1]))).toBe('0x01');
    expect(renderDdl({ ...shopSchema, kind: 'fakedb' }, { tableNames: ['products'] })).toContain('CREATE TABLE ~public~');
    const [suggestion] = suggestCompletions({ sql: 'SELECT * FROM ', offset: 14, kind: 'fakedb', schemas: [{ ...shopSchema, kind: 'fakedb' }], defaultNamespace: 'public' }).filter((item) => item.label === 'order_items');
    expect(suggestion.insertText).toContain('~');
  });

  it('edits data with its placeholders, without any change in the editor', () => {
    const [statement] = buildRowChangeStatements(orders, 'fakedb', false, [{ type: 'update', key: { id: '1' }, values: { status: 'x' } }]);
    expect(statement.sql).toContain('= @p1 WHERE');
    expect(statement.sql).toContain('= @p2');

    const { page } = buildTablePageQuery(orders, 'fakedb', { offset: 0, limit: 10, filters: [{ column: 'status', operator: 'contains', value: 'a' }] });
    expect(page.sql).toContain('TEXT(~status~)');
  });

  it('changes structure with its syntax', () => {
    expect(buildRenameTable('fakedb', { namespace: 'n', name: 't' }, 'u')).toContain('RENAME ~n~.~t~ AS ~u~');
  });
});
