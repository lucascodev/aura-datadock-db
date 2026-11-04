import { listDrivers } from '../../../../drivers/catalog/listDrivers';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import { createCheckbox } from '../fields/createCheckbox';
import { createInput } from '../fields/createInput';
import { createSelect } from '../fields/createSelect';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';
import { getTlsOptions } from '../options/getTlsOptions';

export function createFormControls(onSubmit: (type: 'save' | 'test') => void): ConnectionFormControls {
  const passwordInput = createInput('password');
  passwordInput.type = 'password';
  passwordInput.autocomplete = 'new-password';
  const testStatus = createElement('div', { className: 'test-status' });
  testStatus.setAttribute('role', 'status');
  return {
    heading: createElement('h1'),
    connectionString: createInput('connection-string', 'postgres://user:password@host:5432/database'),
    stringStatus: createElement('div', { className: 'hint string-status' }),
    kindSelect: createSelect('kind', listDrivers().map((driver) => ({ id: driver.id, label: driver.label }))),
    passwordInput,
    tlsSelect: createSelect('tlsMode', getTlsOptions()),
    readOnlyCheckbox: createCheckbox('isReadOnly'),
    usesSshCheckbox: createCheckbox('usesSsh'),
    caFileRow: createElement('div'),
    sshSection: createElement('div', { className: 'section' }),
    testStatus,
    testButton: createElement('button', { className: 'secondary', text: l10n.t('Test Connection'), onClick: () => onSubmit('test') }),
    saveButton: createElement('button', { text: l10n.t('Save'), onClick: () => onSubmit('save') }),
    protectionSummary: createElement('div', { className: 'hint protection-summary' }),
  };
}
