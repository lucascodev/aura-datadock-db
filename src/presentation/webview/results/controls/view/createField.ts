import { createElement } from '../../../shared/dom/createElement';

export function createField(label: string, control: HTMLElement): HTMLElement {
  return createElement('label', { className: 'chart-field' }, [createElement('span', { className: 'chart-field-label', text: label }), control]);
}
