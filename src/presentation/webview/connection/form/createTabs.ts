import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import { Tabs } from '../../shared/dom/Tabs';
import type { FormFields } from '../fields/FormFields';
import { renderCheckbox } from '../fields/renderCheckbox';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';
import type { FormTabId } from '../model/FormTabId';

const SSH_FIELDS = ['sshHost', 'sshPort', 'sshUser', 'sshIdentityFile', 'sshJumpHost'] as const;

function createConnectionContent(controls: ConnectionFormControls, fields: FormFields): HTMLElement[] {
  return [
    fields.renderField(l10n.t('Connection string'), 'connection-string', controls.connectionString, l10n.t('Optional. Paste one to fill in the fields below. It is not stored.')),
    controls.stringStatus,
    fields.renderTextField('name'),
    fields.renderField(l10n.t('Driver'), 'kind', controls.kindSelect),
    createElement('div', { className: 'row' }, [fields.renderTextField('host'), fields.renderTextField('port')]),
    fields.renderTextField('user'),
    fields.renderField(l10n.t('Password'), 'password', controls.passwordInput),
    fields.renderTextField('database'),
    controls.protectionSummary,
  ];
}

function createSecurityContent(controls: ConnectionFormControls, fields: FormFields): HTMLElement[] {
  return [
    fields.renderField(l10n.t('TLS'), 'tlsMode', controls.tlsSelect),
    controls.caFileRow,
    renderCheckbox(controls.readOnlyCheckbox, l10n.t('Read-only'), l10n.t('Blocks every write, in the extension and in the database session.')),
  ];
}

function createSshContent(controls: ConnectionFormControls): HTMLElement[] {
  return [
    renderCheckbox(controls.usesSshCheckbox, l10n.t('Connect through an SSH tunnel'), l10n.t('The host on the Connection tab is resolved by the SSH server.')),
    controls.sshSection,
  ];
}

export function createTabs(controls: ConnectionFormControls, fields: FormFields): Tabs<FormTabId> {
  controls.caFileRow.append(fields.renderTextField('caFile'));
  controls.sshSection.append(
    ...SSH_FIELDS.map((name) => fields.renderTextField(name)),
    createElement('div', { className: 'hint', text: l10n.t('The tunnel uses the ssh command of your system. Password login is not supported, and an unknown host must be accepted once in a terminal.') }),
  );

  return new Tabs<FormTabId>([
    { id: 'connection', label: l10n.t('Connection'), content: createConnectionContent(controls, fields) },
    { id: 'security', label: l10n.t('Security'), content: createSecurityContent(controls, fields) },
    { id: 'ssh', label: l10n.t('SSH'), content: createSshContent(controls) },
  ]);
}
