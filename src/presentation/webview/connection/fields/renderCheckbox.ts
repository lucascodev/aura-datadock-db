import { createElement } from '../../shared/dom/createElement';

export function renderCheckbox(checkbox: HTMLInputElement, label: string, hint: string): HTMLElement {
  const labelElement = createElement('label', { className: 'checkbox' }, [checkbox, document.createTextNode(` ${label}`)]);
  return createElement('div', { className: 'field' }, [labelElement, createElement('div', { className: 'hint', text: hint })]);
}
