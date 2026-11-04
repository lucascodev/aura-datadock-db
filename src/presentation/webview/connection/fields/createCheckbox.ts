import { createElement } from '../../shared/dom/createElement';

export function createCheckbox(id: string): HTMLInputElement {
  const checkbox = createElement('input');
  checkbox.id = id;
  checkbox.type = 'checkbox';
  return checkbox;
}
