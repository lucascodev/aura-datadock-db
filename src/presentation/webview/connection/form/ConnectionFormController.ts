import { parseConnectionString } from '../../../../application/connections/saved/parseConnectionString';
import { suggestProtection } from '../../../../application/connections/guidance/suggestProtection';
import type { DriverId } from '../../../../domain/driver/model/DriverId';
import { getDriver } from '../../../../drivers/catalog/getDriver';
import { listDrivers } from '../../../../drivers/catalog/listDrivers';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { ConnectionFormHostMessage } from '../../../contracts/ConnectionFormMessages';
import { createElement } from '../../shared/dom/createElement';
import type { Tabs } from '../../shared/dom/Tabs';
import { FormFields } from '../fields/FormFields';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';
import type { ConnectionHost } from '../model/ConnectionHost';
import type { FormTabId } from '../model/FormTabId';
import { createFormControls } from './createFormControls';
import { createTabs } from './createTabs';
import { describeProtection } from './describeProtection';
import { fillForm } from './fillForm';
import { readInput } from './readInput';
import { revealFirstError } from './revealFirstError';

export class ConnectionFormController {
  private readonly fields: FormFields;
  private readonly controls: ConnectionFormControls;
  private readonly tabs: Tabs<FormTabId>;
  private hasChosenProtection = false;

  constructor(
    private readonly host: ConnectionHost,
    app: HTMLElement,
  ) {
    this.fields = new FormFields((field) => host.postMessage({ type: 'chooseFile', field }));
    this.controls = createFormControls((type) => this.submit(type));
    this.tabs = createTabs(this.controls, this.fields);
    app.append(
      this.controls.heading,
      this.tabs.element,
      createElement('div', { className: 'actions' }, [this.controls.saveButton, this.controls.testButton, createElement('button', { className: 'secondary', text: l10n.t('Cancel'), onClick: () => host.postMessage({ type: 'cancel' }) })]),
      this.controls.testStatus,
    );
    this.registerBehavior();
  }

  handleHostMessage(message: ConnectionFormHostMessage): void {
    const { testStatus } = this.controls;
    switch (message.type) {
      case 'init':
        this.applyInit(message);
        return;
      case 'errors':
        this.showErrors(message.errors);
        return;
      case 'testResult':
        testStatus.textContent = message.message;
        testStatus.className = `test-status ${message.isSuccess ? 'success' : 'failure'}`;
        this.setBusy(false);
        return;
      case 'fileChosen':
        this.fields.setText(message.field, message.path);
        return;
    }
  }

  private registerBehavior(): void {
    const { connectionString, kindSelect, usesSshCheckbox, tlsSelect, readOnlyCheckbox } = this.controls;
    connectionString.addEventListener('change', () => this.fillFromConnectionString());
    kindSelect.addEventListener('change', () => this.suggestDefaultPort());
    this.fields.listenToInput('host', () => this.applySuggestedProtection());
    usesSshCheckbox.addEventListener('change', () => {
      this.applySuggestedProtection();
      this.updateVisibility();
    });
    for (const control of [tlsSelect, readOnlyCheckbox]) {
      control.addEventListener('change', () => {
        this.hasChosenProtection = true;
        this.updateVisibility();
      });
    }
  }

  private suggestDefaultPort(): void {
    const port = this.fields.readText('port');
    const isDefaultPort = !port || listDrivers().some((driver) => driver.defaultPort === Number(port));
    if (isDefaultPort) {
      this.fields.setText('port', String(getDriver(this.controls.kindSelect.value as DriverId).defaultPort));
    }
  }

  private showErrors(errors: Extract<ConnectionFormHostMessage, { type: 'errors' }>['errors']): void {
    this.fields.showErrors(errors);
    revealFirstError(this.tabs, errors);
    if (Object.keys(errors).length > 0) {
      this.setBusy(false);
      this.controls.testStatus.textContent = '';
    }
  }

  private applyInit(message: Extract<ConnectionFormHostMessage, { type: 'init' }>): void {
    const { isEditing } = message;
    const { heading, passwordInput, kindSelect } = this.controls;
    heading.textContent = isEditing ? l10n.t('Edit Connection') : l10n.t('Add New Connection');
    passwordInput.placeholder = isEditing && message.hasPassword ? l10n.t('Leave empty to keep the current password') : '';
    this.hasChosenProtection = isEditing;
    if (message.input) {
      fillForm(this.controls, this.fields, message.input);
    } else {
      this.fields.setText('port', String(getDriver(kindSelect.value).defaultPort));
      this.applySuggestedProtection();
    }
    this.updateVisibility();
  }

  private fillFromConnectionString(): void {
    const { connectionString, stringStatus, kindSelect, passwordInput, tlsSelect } = this.controls;
    const parsed = parseConnectionString(connectionString.value);
    if (!parsed) {
      stringStatus.textContent = connectionString.value.trim() ? l10n.t('This does not look like a postgres:// or mysql:// connection string.') : '';
      return;
    }
    kindSelect.value = parsed.kind;
    this.fields.setText('host', parsed.host);
    this.fields.setText('port', parsed.port);
    this.fields.setText('user', parsed.user);
    this.fields.setText('database', parsed.database);
    if (parsed.password) {
      passwordInput.value = parsed.password;
    }
    this.applySuggestedProtection();
    if (parsed.tlsMode) {
      tlsSelect.value = parsed.tlsMode;
    }
    connectionString.value = '';
    stringStatus.textContent = l10n.t('Fields filled in. Review them below.');
    this.updateVisibility();
  }

  private applySuggestedProtection(): void {
    if (this.hasChosenProtection) {
      return;
    }
    const { tlsSelect, readOnlyCheckbox, usesSshCheckbox } = this.controls;
    const suggestion = suggestProtection(this.fields.readText('host'), usesSshCheckbox.checked);
    tlsSelect.value = suggestion.tlsMode;
    readOnlyCheckbox.checked = suggestion.isReadOnly;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const { caFileRow, sshSection, tlsSelect, usesSshCheckbox, protectionSummary } = this.controls;
    caFileRow.hidden = tlsSelect.value !== 'verified';
    sshSection.hidden = !usesSshCheckbox.checked;
    this.tabs.setBadge('ssh', usesSshCheckbox.checked ? 'on' : '');
    protectionSummary.textContent = describeProtection(this.controls);
  }

  private submit(type: 'save' | 'test'): void {
    const { testStatus, passwordInput } = this.controls;
    this.setBusy(true);
    this.fields.showErrors({});
    this.tabs.markErrors(new Set());
    testStatus.textContent = type === 'test' ? l10n.t('Testing…') : '';
    testStatus.className = 'test-status';
    this.host.postMessage({ type, input: readInput(this.controls, this.fields), password: passwordInput.value });
  }

  private setBusy(isBusy: boolean): void {
    this.controls.saveButton.disabled = isBusy;
    this.controls.testButton.disabled = isBusy;
  }
}
