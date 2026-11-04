import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { ConnectionInput } from '../../../../application/connections/model/ConnectionInput';
import type { ConnectionFileField } from '../../../contracts/ConnectionFormMessages';
import { createElement } from '../../shared/dom/createElement';
import type { TextFieldName } from '../model/TextFieldName';
import { createInput } from './createInput';
import { getTextFields } from './getTextFields';

export class FormFields {
  private readonly textInputs = new Map<TextFieldName, HTMLInputElement>();
  private readonly errorLabels = new Map<string, HTMLElement>();

  constructor(private readonly onBrowse: (field: ConnectionFileField) => void) {}

  readText(name: TextFieldName): string {
    return this.textInputs.get(name)?.value ?? '';
  }

  setText(name: TextFieldName, value: string): void {
    const input = this.textInputs.get(name);
    if (input) {
      input.value = value;
    }
  }

  listenToInput(name: TextFieldName, listener: () => void): void {
    this.textInputs.get(name)?.addEventListener('input', listener);
  }

  showErrors(errors: Readonly<Partial<Record<keyof ConnectionInput, string>>>): void {
    for (const [name, label] of this.errorLabels) {
      label.textContent = errors[name as keyof ConnectionInput] ?? '';
    }
  }

  renderTextField(name: TextFieldName): HTMLElement {
    const definition = getTextFields()[name];
    const input = createInput(name, definition.placeholder);
    this.textInputs.set(name, input);
    const control = definition.file
      ? createElement('div', { className: 'file-control' }, [input, this.renderBrowse(definition.file)])
      : input;
    return this.renderField(definition.label, name, control, definition.hint);
  }

  renderField(label: string, id: string, control: HTMLElement, hint?: string): HTMLElement {
    const labelElement = createElement('label', { text: label });
    labelElement.htmlFor = id;
    const error = createElement('div', { className: 'error' });
    this.errorLabels.set(id, error);
    return createElement('div', { className: 'field' }, [
      labelElement,
      control,
      ...(hint ? [createElement('div', { className: 'hint', text: hint })] : []),
      error,
    ]);
  }

  private renderBrowse(field: ConnectionFileField): HTMLElement {
    return createElement('button', { className: 'secondary', text: l10n.t('Browse…'), onClick: () => this.onBrowse(field) });
  }
}
