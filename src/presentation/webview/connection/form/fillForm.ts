import type { ConnectionInput } from '../../../../application/connections/model/ConnectionInput';
import { getTextFields } from '../fields/getTextFields';
import type { FormFields } from '../fields/FormFields';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';
import type { TextFieldName } from '../model/TextFieldName';

export function fillForm(controls: ConnectionFormControls, fields: FormFields, input: ConnectionInput): void {
  (Object.keys(getTextFields()) as TextFieldName[]).forEach((name) => fields.setText(name, input[name]));
  controls.kindSelect.value = input.kind;
  controls.tlsSelect.value = input.tlsMode;
  controls.readOnlyCheckbox.checked = input.isReadOnly;
  controls.usesSshCheckbox.checked = input.usesSsh;
}
