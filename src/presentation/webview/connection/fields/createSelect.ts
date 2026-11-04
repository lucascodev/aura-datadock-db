import { createElement } from '../../shared/dom/createElement';

export function createSelect(id: string, options: readonly { readonly id: string; readonly label: string }[]): HTMLSelectElement {
  const select = createElement('select');
  select.id = id;
  select.append(...options.map((entry) => {
    const option = createElement('option', { text: entry.label });
    option.value = entry.id;
    return option;
  }));
  return select;
}
