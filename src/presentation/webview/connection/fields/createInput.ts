import { createElement } from '../../shared/dom/createElement';

export function createInput(id: string, placeholder?: string): HTMLInputElement {
  const input = createElement('input');
  input.id = id;
  input.spellcheck = false;
  input.placeholder = placeholder ?? '';
  return input;
}
