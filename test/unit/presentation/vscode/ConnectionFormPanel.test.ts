import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionInput } from '../../../../src/application/connections/model/ConnectionInput';
import { SavedConnections } from '../../../../src/application/connections/saved/SavedConnections';
import type { ConnectionTarget } from '../../../../src/domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../src/domain/database/ports/DatabaseAdapter';
import type { SavedConnection } from '../../../../src/domain/connection/model/SavedConnection';
import { ConnectionFormPanel } from '../../../../src/presentation/vscode/panels/connection/ConnectionFormPanel';
import { createdPanels, Uri, window, type FakeWebviewPanel } from '../../../fixtures/vscodeStub';

const openAdapter = vi.fn<(target: ConnectionTarget) => Promise<DatabaseAdapter>>();

const SECRET = 'super-secret-password';

const input: ConnectionInput = {
  name: 'Staging',
  kind: 'postgres',
  host: 'db.example.com',
  port: '5432',
  user: 'app',
  database: 'shop',
  tlsMode: 'verified',
  caFile: '',
  isReadOnly: true,
  usesSsh: false,
  sshHost: '',
  sshPort: '',
  sshUser: '',
  sshIdentityFile: '',
  sshJumpHost: '',
};

const existing: SavedConnection = {
  id: 'existing-id',
  name: 'Staging',
  kind: 'postgres',
  host: 'db.example.com',
  port: 5432,
  user: 'app',
  database: 'shop',
  tlsMode: 'verified',
  isReadOnly: true,
};

function setup(initial: readonly SavedConnection[] = [], storedPasswords: Record<string, string> = {}) {
  let stored: readonly unknown[] = initial;
  const saved = new SavedConnections({
    read: () => stored,
    write: async (connections) => {
      stored = connections;
    },
  });
  const passwords = new Map(Object.entries(storedPasswords));
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const form = new ConnectionFormPanel({
    extensionUri: Uri as never,
    saved,
    openAdapter,
    readPassword: async (id) => passwords.get(id),
    storePassword: async (id, password) => {
      passwords.set(id, password);
    },
    onSaved,
  });
  return { form, saved, passwords, onSaved };
}

function currentPanel(): FakeWebviewPanel {
  return createdPanels[createdPanels.length - 1];
}

function createWorkingAdapter(): DatabaseAdapter {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    listNamespaces: vi.fn().mockResolvedValue(['public', 'audit']),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as DatabaseAdapter;
}

describe('ConnectionFormPanel', () => {
  beforeEach(() => {
    createdPanels.length = 0;
    vi.mocked(openAdapter).mockReset();
    window.showOpenDialog.mockReset();
  });

  describe('opening', () => {
    it('starts empty for a new connection', async () => {
      const { form } = setup();
      form.open();
      await currentPanel().receive({ type: 'ready' });
      expect(currentPanel().title).toBe('Add New Connection');
      expect(currentPanel().posted).toEqual([{ type: 'init', isEditing: false, input: undefined, hasPassword: false }]);
    });

    it('fills in the fields when editing', async () => {
      const { form } = setup([existing], { 'existing-id': SECRET });
      form.open(existing);
      await currentPanel().receive({ type: 'ready' });
      expect(currentPanel().title).toBe('Edit Staging');
      expect(currentPanel().posted[0]).toMatchObject({ isEditing: true, hasPassword: true, input: { host: 'db.example.com', port: '5432' } });
    });

    it('never sends the stored password to the webview', async () => {
      const { form } = setup([existing], { 'existing-id': SECRET });
      vi.mocked(openAdapter).mockResolvedValue(createWorkingAdapter());
      form.open(existing);
      await currentPanel().receive({ type: 'ready' });
      await currentPanel().receive({ type: 'test', input, password: '' });
      expect(JSON.stringify(currentPanel().posted)).not.toContain(SECRET);
    });

    it('reuses the panel when opened again', () => {
      const { form } = setup();
      form.open();
      form.open();
      expect(createdPanels).toHaveLength(1);
    });
  });

  describe('saving', () => {
    it('stores the connection without the password, and the password apart', async () => {
      const { form, saved, passwords, onSaved } = setup();
      form.open();
      await currentPanel().receive({ type: 'save', input, password: SECRET });

      const [connection] = saved.list();
      expect(connection).toMatchObject({ name: 'Staging', port: 5432, isReadOnly: true });
      expect(JSON.stringify(connection)).not.toContain(SECRET);
      expect(passwords.get(connection.id)).toBe(SECRET);
      expect(onSaved).toHaveBeenCalledWith(connection);
      expect(currentPanel().isDisposed).toBe(true);
    });

    it('stores an empty password for a new connection, so it does not ask again', async () => {
      const { form, saved, passwords } = setup();
      form.open();
      await currentPanel().receive({ type: 'save', input, password: '' });
      expect(passwords.get(saved.list()[0].id)).toBe('');
    });

    it('keeps the current password when editing with the field empty', async () => {
      const { form, passwords } = setup([existing], { 'existing-id': SECRET });
      form.open(existing);
      await currentPanel().receive({ type: 'save', input: { ...input, port: '6543' }, password: '' });
      expect(passwords.get('existing-id')).toBe(SECRET);
    });

    it('replaces the password when a new one is typed', async () => {
      const { form, passwords } = setup([existing], { 'existing-id': SECRET });
      form.open(existing);
      await currentPanel().receive({ type: 'save', input, password: 'new' });
      expect(passwords.get('existing-id')).toBe('new');
    });

    it('keeps the id when editing, without duplicating the connection', async () => {
      const { form, saved } = setup([existing]);
      form.open(existing);
      await currentPanel().receive({ type: 'save', input: { ...input, name: 'Renamed' }, password: '' });
      expect(saved.list()).toHaveLength(1);
      expect(saved.list()[0]).toMatchObject({ id: 'existing-id', name: 'Renamed' });
    });

    it('shows errors and keeps the form open when the input is invalid', async () => {
      const { form, saved, onSaved } = setup();
      form.open();
      await currentPanel().receive({ type: 'save', input: { ...input, host: '-oProxyCommand=calc' }, password: '' });
      expect(currentPanel().posted).toEqual([{ type: 'errors', errors: { host: expect.any(String) } }]);
      expect(saved.list()).toEqual([]);
      expect(onSaved).not.toHaveBeenCalled();
      expect(currentPanel().isDisposed).toBe(false);
    });

    it('reports a failure to save and keeps the form open', async () => {
      const { form, onSaved } = setup();
      onSaved.mockRejectedValue(new Error('settings are read-only'));
      form.open();
      await currentPanel().receive({ type: 'save', input, password: '' });
      expect(currentPanel().posted).toContainEqual({ type: 'testResult', isSuccess: false, message: 'Could not save: settings are read-only' });
      expect(currentPanel().isDisposed).toBe(false);
    });

    it('refuses a name used by another connection, but not its own', async () => {
      const other = { ...existing, id: 'other', name: 'Taken' };
      const { form } = setup([existing, other]);
      form.open(existing);

      await currentPanel().receive({ type: 'save', input: { ...input, name: 'Taken' }, password: '' });
      expect(currentPanel().posted).toEqual([{ type: 'errors', errors: { name: expect.any(String) } }]);

      await currentPanel().receive({ type: 'save', input, password: '' });
      expect(currentPanel().isDisposed).toBe(true);
    });
  });

  describe('testing', () => {
    it('connects with the typed password and reports the result, without saving', async () => {
      const { form, saved } = setup();
      const adapter = createWorkingAdapter();
      vi.mocked(openAdapter).mockResolvedValue(adapter);
      form.open();

      await currentPanel().receive({ type: 'test', input, password: SECRET });

      expect(vi.mocked(openAdapter).mock.calls[0][0]).toMatchObject({ password: SECRET, host: 'db.example.com' });
      expect(currentPanel().posted).toContainEqual({ type: 'testResult', isSuccess: true, message: 'Connected. 2 schema(s) found.' });
      expect(adapter.dispose).toHaveBeenCalledTimes(1);
      expect(saved.list()).toEqual([]);
    });

    it('uses the stored password when editing with the field empty', async () => {
      const { form } = setup([existing], { 'existing-id': SECRET });
      vi.mocked(openAdapter).mockResolvedValue(createWorkingAdapter());
      form.open(existing);
      await currentPanel().receive({ type: 'test', input, password: '' });
      expect(vi.mocked(openAdapter).mock.calls[0][0].password).toBe(SECRET);
    });

    it('reports a failure with guidance and releases the connection', async () => {
      const { form } = setup();
      const adapter = createWorkingAdapter();
      vi.mocked(adapter.connect).mockRejectedValue(new Error('self-signed certificate'));
      vi.mocked(openAdapter).mockResolvedValue(adapter);
      form.open();

      await currentPanel().receive({ type: 'test', input, password: '' });

      expect(currentPanel().posted).toContainEqual({ type: 'testResult', isSuccess: false, message: expect.stringContaining('CA file') });
      expect(adapter.dispose).toHaveBeenCalledTimes(1);
    });

    it('reports a tunnel that could not open', async () => {
      const { form } = setup();
      vi.mocked(openAdapter).mockRejectedValue(new Error('The SSH server refused the key.'));
      form.open();
      await currentPanel().receive({ type: 'test', input, password: '' });
      expect(currentPanel().posted).toContainEqual({ type: 'testResult', isSuccess: false, message: 'The SSH server refused the key.' });
    });

    it('does not try to connect with invalid input', async () => {
      const { form } = setup();
      form.open();
      await currentPanel().receive({ type: 'test', input: { ...input, port: 'abc' }, password: '' });
      expect(openAdapter).not.toHaveBeenCalled();
      expect(currentPanel().posted).toEqual([{ type: 'errors', errors: { port: expect.any(String) } }]);
    });
  });

  it('closes on cancel', async () => {
    const { form } = setup();
    form.open();
    await currentPanel().receive({ type: 'cancel' });
    expect(currentPanel().isDisposed).toBe(true);
  });

  it('returns the chosen file to the form', async () => {
    const { form } = setup();
    window.showOpenDialog.mockResolvedValue([{ fsPath: 'C:\\keys\\ca.pem' }]);
    form.open();
    await currentPanel().receive({ type: 'chooseFile', field: 'caFile' });
    expect(currentPanel().posted).toContainEqual({ type: 'fileChosen', field: 'caFile', path: 'C:\\keys\\ca.pem' });
  });
});
