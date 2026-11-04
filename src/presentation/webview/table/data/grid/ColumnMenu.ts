import { createElement } from '../../../shared/createElement';

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

  menu.append(...items.map((item) => {
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
  }));

  document.body.append(menu);
  menu.style.left = `${Math.min(anchor.left, window.innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${Math.min(anchor.bottom, window.innerHeight - menu.offsetHeight - 8)}px`;
  document.addEventListener('pointerdown', handleOutside, true);
  document.addEventListener('keydown', handleKey, true);
  closeOpenMenu = close;
  menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
}
