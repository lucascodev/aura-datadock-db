import type { ConnectionInput } from '../../../application/connections/model/ConnectionInput';
import { parseConnectionString } from '../../../application/connections/saved/parseConnectionString';
import { suggestProtection } from '../../../application/connections/guidance/suggestProtection';
import type { TlsMode } from '../../../domain/connection/model/ConnectionTls';
import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver, listDrivers } from '../../../drivers/catalog/driverCatalog';
import type { ConnectionFileField, ConnectionFormHostMessage, ConnectionFormWebviewMessage } from '../../contracts/ConnectionFormMessages';
import { l10n, useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { createElement } from '../shared/dom/createElement';
import { connectToHost } from '../shared/host/vscodeApi';
import { Tabs } from '../shared/dom/Tabs';

useL10nCatalog(readL10nCatalog());

type TextFieldName = 'name' | 'host' | 'port' | 'user' | 'database' | 'caFile' | 'sshHost' | 'sshPort' | 'sshUser' | 'sshIdentityFile' | 'sshJumpHost';

interface TextFieldDefinition {
  readonly label: string;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly file?: ConnectionFileField;
}

function getTextFields(): Readonly<Record<TextFieldName, TextFieldDefinition>> {
  return {
    name: { label: l10n.t('Name'), placeholder: l10n.t('Staging database') },
    host: { label: l10n.t('Host'), placeholder: 'localhost' },
    port: { label: l10n.t('Port') },
    user: { label: l10n.t('User') },
    database: { label: l10n.t('Database'), hint: l10n.t('Optional. Leave empty to use the default of the user.') },
    caFile: { label: l10n.t('CA file'), hint: l10n.t('Optional. Needed when the certificate is not signed by a public authority, as in Amazon RDS.'), file: 'caFile' },
    sshHost: { label: l10n.t('SSH host'), placeholder: 'bastion.example.com', hint: l10n.t('A host name, or an alias from your SSH config.') },
    sshPort: { label: l10n.t('SSH port'), placeholder: '22' },
    sshUser: { label: l10n.t('SSH user'), hint: l10n.t('Optional. Your SSH config is used when empty.') },
    sshIdentityFile: { label: l10n.t('Private key'), hint: l10n.t('Optional. Your SSH config and ssh-agent are used when empty. Keys with a passphrase must be in ssh-agent.'), file: 'sshIdentityFile' },
    sshJumpHost: { label: l10n.t('Jump host'), hint: l10n.t('Optional. Same as ssh -J.') },
  };
}

type FormTabId = 'connection' | 'security' | 'ssh';

const TAB_ORDER: readonly FormTabId[] = ['connection', 'security', 'ssh'];

const FIELD_TABS: Readonly<Record<keyof ConnectionInput, FormTabId>> = {
  name: 'connection',
  kind: 'connection',
  host: 'connection',
  port: 'connection',
  user: 'connection',
  database: 'connection',
  tlsMode: 'security',
  caFile: 'security',
  isReadOnly: 'security',
  usesSsh: 'ssh',
  sshHost: 'ssh',
  sshPort: 'ssh',
  sshUser: 'ssh',
  sshIdentityFile: 'ssh',
  sshJumpHost: 'ssh',
};

function getTlsSummary(): Readonly<Record<TlsMode, string>> {
  return {
    off: l10n.t('TLS off'),
    required: l10n.t('TLS required'),
    verified: l10n.t('TLS verified'),
  };
}

function getTlsOptions(): readonly { readonly id: TlsMode; readonly label: string }[] {
  return [
    { id: 'off', label: l10n.t('Off') },
    { id: 'required', label: l10n.t('Required: encrypt, do not validate the certificate') },
    { id: 'verified', label: l10n.t('Verified: encrypt and validate the certificate') },
  ];
}

const host = connectToHost<ConnectionFormWebviewMessage>();
const app = document.getElementById('app') as HTMLElement;

const textInputs = new Map<TextFieldName, HTMLInputElement>();
const errorLabels = new Map<string, HTMLElement>();
let isEditing = false;
let hasChosenProtection = false;

const heading = createElement('h1');
const connectionString = createInput('connection-string', 'postgres://user:password@host:5432/database');
const stringStatus = createElement('div', { className: 'hint string-status' });
const kindSelect = createSelect('kind', listDrivers().map((driver) => ({ id: driver.id, label: driver.label })));
const passwordInput = createInput('password');
const tlsSelect = createSelect('tlsMode', getTlsOptions());
const readOnlyCheckbox = createCheckbox('isReadOnly');
const usesSshCheckbox = createCheckbox('usesSsh');
const caFileRow = createElement('div');
const sshSection = createElement('div', { className: 'section' });
const testStatus = createElement('div', { className: 'test-status' });
const testButton = createElement('button', { className: 'secondary', text: l10n.t('Test Connection'), onClick: () => submit('test') });
const saveButton = createElement('button', { text: l10n.t('Save'), onClick: () => submit('save') });
const protectionSummary = createElement('div', { className: 'hint protection-summary' });
const tabs = createTabs();

passwordInput.type = 'password';
passwordInput.autocomplete = 'new-password';
testStatus.setAttribute('role', 'status');

render();
registerBehavior();
window.addEventListener('message', (event: MessageEvent<ConnectionFormHostMessage>) => handleHostMessage(event.data));
host.postMessage({ type: 'ready' });

function createTabs(): Tabs<FormTabId> {
  caFileRow.append(renderTextField('caFile'));
  sshSection.append(
    ...(['sshHost', 'sshPort', 'sshUser', 'sshIdentityFile', 'sshJumpHost'] as const).map(renderTextField),
    createElement('div', { className: 'hint', text: l10n.t('The tunnel uses the ssh command of your system. Password login is not supported, and an unknown host must be accepted once in a terminal.') }),
  );

  return new Tabs<FormTabId>([
    {
      id: 'connection',
      label: l10n.t('Connection'),
      content: [
        renderField(l10n.t('Connection string'), 'connection-string', connectionString, l10n.t('Optional. Paste one to fill in the fields below. It is not stored.')),
        stringStatus,
        renderTextField('name'),
        renderField(l10n.t('Driver'), 'kind', kindSelect),
        createElement('div', { className: 'row' }, [renderTextField('host'), renderTextField('port')]),
        renderTextField('user'),
        renderField(l10n.t('Password'), 'password', passwordInput),
        renderTextField('database'),
        protectionSummary,
      ],
    },
    {
      id: 'security',
      label: l10n.t('Security'),
      content: [
        renderField(l10n.t('TLS'), 'tlsMode', tlsSelect),
        caFileRow,
        renderCheckbox(readOnlyCheckbox, l10n.t('Read-only'), l10n.t('Blocks every write, in the extension and in the database session.')),
      ],
    },
    {
      id: 'ssh',
      label: l10n.t('SSH'),
      content: [
        renderCheckbox(usesSshCheckbox, l10n.t('Connect through an SSH tunnel'), l10n.t('The host on the Connection tab is resolved by the SSH server.')),
        sshSection,
      ],
    },
  ]);
}

function render(): void {
  app.append(
    heading,
    tabs.element,
    createElement('div', { className: 'actions' }, [saveButton, testButton, createElement('button', { className: 'secondary', text: l10n.t('Cancel'), onClick: () => host.postMessage({ type: 'cancel' }) })]),
    testStatus,
  );
}

function registerBehavior(): void {
  connectionString.addEventListener('change', fillFromConnectionString);
  kindSelect.addEventListener('change', () => {
    const port = readText('port');
    const isDefaultPort = !port || listDrivers().some((driver) => driver.defaultPort === Number(port));
    if (isDefaultPort) {
      setText('port', String(getDriver(kindSelect.value as DriverId).defaultPort));
    }
  });
  textInputs.get('host')?.addEventListener('input', applySuggestedProtection);
  usesSshCheckbox.addEventListener('change', () => {
    applySuggestedProtection();
    updateVisibility();
  });
  tlsSelect.addEventListener('change', () => {
    hasChosenProtection = true;
    updateVisibility();
  });
  readOnlyCheckbox.addEventListener('change', () => {
    hasChosenProtection = true;
    updateVisibility();
  });
}

function handleHostMessage(message: ConnectionFormHostMessage): void {
  switch (message.type) {
    case 'init':
      applyInit(message);
      return;
    case 'errors':
      showErrors(message.errors);
      revealFirstError(message.errors);
      if (Object.keys(message.errors).length > 0) {
        setBusy(false);
        testStatus.textContent = '';
      }
      return;
    case 'testResult':
      testStatus.textContent = message.message;
      testStatus.className = `test-status ${message.isSuccess ? 'success' : 'failure'}`;
      setBusy(false);
      return;
    case 'fileChosen':
      setText(message.field, message.path);
      return;
  }
}

function applyInit(message: Extract<ConnectionFormHostMessage, { type: 'init' }>): void {
  isEditing = message.isEditing;
  heading.textContent = isEditing ? l10n.t('Edit Connection') : l10n.t('Add New Connection');
  passwordInput.placeholder = isEditing && message.hasPassword ? l10n.t('Leave empty to keep the current password') : '';
  hasChosenProtection = isEditing;
  if (message.input) {
    fillForm(message.input);
  } else {
    setText('port', String(getDriver(kindSelect.value).defaultPort));
    applySuggestedProtection();
  }
  updateVisibility();
}

function fillForm(input: ConnectionInput): void {
  (Object.keys(getTextFields()) as TextFieldName[]).forEach((name) => setText(name, input[name]));
  kindSelect.value = input.kind;
  tlsSelect.value = input.tlsMode;
  readOnlyCheckbox.checked = input.isReadOnly;
  usesSshCheckbox.checked = input.usesSsh;
}

function fillFromConnectionString(): void {
  const parsed = parseConnectionString(connectionString.value);
  if (!parsed) {
    stringStatus.textContent = connectionString.value.trim() ? l10n.t('This does not look like a postgres:// or mysql:// connection string.') : '';
    return;
  }
  kindSelect.value = parsed.kind;
  setText('host', parsed.host);
  setText('port', parsed.port);
  setText('user', parsed.user);
  setText('database', parsed.database);
  if (parsed.password) {
    passwordInput.value = parsed.password;
  }
  applySuggestedProtection();
  if (parsed.tlsMode) {
    tlsSelect.value = parsed.tlsMode;
  }
  connectionString.value = '';
  stringStatus.textContent = l10n.t('Fields filled in. Review them below.');
  updateVisibility();
}

function applySuggestedProtection(): void {
  if (hasChosenProtection) {
    return;
  }
  const suggestion = suggestProtection(readText('host'), usesSshCheckbox.checked);
  tlsSelect.value = suggestion.tlsMode;
  readOnlyCheckbox.checked = suggestion.isReadOnly;
  updateVisibility();
}

function updateVisibility(): void {
  caFileRow.hidden = tlsSelect.value !== 'verified';
  sshSection.hidden = !usesSshCheckbox.checked;
  tabs.setBadge('ssh', usesSshCheckbox.checked ? 'on' : '');
  protectionSummary.textContent = describeProtection();
}

function describeProtection(): string {
  const parts = [
    readOnlyCheckbox.checked ? l10n.t('Read-only') : l10n.t('Writes allowed'),
    getTlsSummary()[tlsSelect.value as TlsMode],
    ...(usesSshCheckbox.checked ? [l10n.t('through SSH')] : []),
  ];
  return l10n.t('{0}. Change it on the Security and SSH tabs.', parts.join(' · '));
}

function revealFirstError(errors: Readonly<Partial<Record<keyof ConnectionInput, string>>>): void {
  const tabsWithErrors = new Set((Object.keys(errors) as (keyof ConnectionInput)[]).map((field) => FIELD_TABS[field]));
  tabs.markErrors(tabsWithErrors);
  const first = TAB_ORDER.find((tab) => tabsWithErrors.has(tab));
  if (first) {
    tabs.select(first);
  }
}

function submit(type: 'save' | 'test'): void {
  setBusy(true);
  showErrors({});
  tabs.markErrors(new Set());
  testStatus.textContent = type === 'test' ? l10n.t('Testing…') : '';
  testStatus.className = 'test-status';
  host.postMessage({ type, input: readInput(), password: passwordInput.value });
}

function readInput(): ConnectionInput {
  return {
    name: readText('name'),
    kind: kindSelect.value as DriverId,
    host: readText('host'),
    port: readText('port'),
    user: readText('user'),
    database: readText('database'),
    tlsMode: tlsSelect.value as TlsMode,
    caFile: readText('caFile'),
    isReadOnly: readOnlyCheckbox.checked,
    usesSsh: usesSshCheckbox.checked,
    sshHost: readText('sshHost'),
    sshPort: readText('sshPort'),
    sshUser: readText('sshUser'),
    sshIdentityFile: readText('sshIdentityFile'),
    sshJumpHost: readText('sshJumpHost'),
  };
}

function showErrors(errors: Readonly<Partial<Record<keyof ConnectionInput, string>>>): void {
  for (const [name, label] of errorLabels) {
    label.textContent = errors[name as keyof ConnectionInput] ?? '';
  }
}

function setBusy(isBusy: boolean): void {
  saveButton.disabled = isBusy;
  testButton.disabled = isBusy;
}

function readText(name: TextFieldName): string {
  return textInputs.get(name)?.value ?? '';
}

function setText(name: TextFieldName, value: string): void {
  const input = textInputs.get(name);
  if (input) {
    input.value = value;
  }
}

function renderTextField(name: TextFieldName): HTMLElement {
  const definition = getTextFields()[name];
  const input = createInput(name, definition.placeholder);
  textInputs.set(name, input);
  const control = definition.file
    ? createElement('div', { className: 'file-control' }, [input, renderBrowse(definition.file)])
    : input;
  return renderField(definition.label, name, control, definition.hint);
}

function renderBrowse(field: ConnectionFileField): HTMLElement {
  return createElement('button', { className: 'secondary', text: l10n.t('Browse…'), onClick: () => host.postMessage({ type: 'chooseFile', field }) });
}

function renderField(label: string, id: string, control: HTMLElement, hint?: string): HTMLElement {
  const labelElement = createElement('label', { text: label });
  labelElement.htmlFor = id;
  const error = createElement('div', { className: 'error' });
  errorLabels.set(id, error);
  return createElement('div', { className: 'field' }, [
    labelElement,
    control,
    ...(hint ? [createElement('div', { className: 'hint', text: hint })] : []),
    error,
  ]);
}

function renderCheckbox(checkbox: HTMLInputElement, label: string, hint: string): HTMLElement {
  const labelElement = createElement('label', { className: 'checkbox' }, [checkbox, document.createTextNode(` ${label}`)]);
  return createElement('div', { className: 'field' }, [labelElement, createElement('div', { className: 'hint', text: hint })]);
}

function createInput(id: string, placeholder?: string): HTMLInputElement {
  const input = createElement('input');
  input.id = id;
  input.spellcheck = false;
  input.placeholder = placeholder ?? '';
  return input;
}

function createCheckbox(id: string): HTMLInputElement {
  const checkbox = createElement('input');
  checkbox.id = id;
  checkbox.type = 'checkbox';
  return checkbox;
}

function createSelect(id: string, options: readonly { readonly id: string; readonly label: string }[]): HTMLSelectElement {
  const select = createElement('select');
  select.id = id;
  select.append(...options.map((entry) => {
    const option = createElement('option', { text: entry.label });
    option.value = entry.id;
    return option;
  }));
  return select;
}
