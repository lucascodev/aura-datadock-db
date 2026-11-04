import { createElement } from '../../../shared/dom/createElement';
import type { SelectOption } from '../model/SelectOption';

export function createSelect(options: readonly SelectOption[], current: string, onChange: (value: string) => void): HTMLSelectElement {
  const element = createElement('select');
  element.append(
    ...options.map((option) => {
      const item = createElement('option', { text: option.label });
      item.value = option.value;
      return item;
    }),
  );
  element.value = current;
  element.addEventListener('change', () => onChange(element.value));
  return element;
}
