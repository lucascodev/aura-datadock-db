import { createElement } from '../../../shared/dom/createElement';

interface ColumnMenuItem {
  readonly label: string;
  readonly isEnabled?: boolean;
  onSelect(): void;
}

let closeOpenMenu: (() => void) | undefined;

export function showColumnMenu(anchor: DOMRect, items: readonly ColumnMenuItem[]): void {
  closeOpenMenu?.();

  const menu = createElement('div', { className: 'column-menu' });
  menu.setAttribute('role', 'menu');
  const { close, listen } = createDismissal(menu);
  menu.append(...items.map((item) => renderMenuItem(item, close)));

  document.body.append(menu);
  menu.style.left = `${Math.min(anchor.left, window.innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${Math.min(anchor.bottom, window.innerHeight - menu.offsetHeight - 8)}px`;
  listen();
  menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
}

function createDismissal(menu: HTMLElement): { readonly close: () => void; readonly listen: () => void } {
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', handleOutside, true);
    document.removeEventListener('keydown', handleKey, true);
    closeOpenMenu = undefined;
  };
  const handleOutside = (event: PointerEvent) => {
    if (!menu.contains(event.target as Node)) {
      close();
    }
  };
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  const listen = () => {
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('keydown', handleKey, true);
    closeOpenMenu = close;
  };
  return { close, listen };
}

function renderMenuItem(item: ColumnMenuItem, close: () => void): HTMLElement {
  const button = createElement('button', {
    className: 'menu-item',
    text: item.label,
    onClick: () => {
      close();
      item.onSelect();
    },
  });
  button.setAttribute('role', 'menuitem');
  button.disabled = item.isEnabled === false;
  return button;
}
