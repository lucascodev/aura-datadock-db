import { createElement } from '../../../shared/dom/createElement';

export function createToggle(label: string, isOn: boolean, onChange: (isOn: boolean) => void): HTMLElement {
  const input = createElement('input');
  input.type = 'checkbox';
  input.checked = isOn;
  input.addEventListener('change', () => onChange(input.checked));
  return createElement('label', { className: 'chart-toggle' }, [input, createElement('span', { text: label })]);
}
