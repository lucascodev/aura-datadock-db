interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly title?: string;
  readonly onClick?: () => void;
}

export function createElement<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  options: ElementOptions = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  if (options.className) {
    element.className = options.className;
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  if (options.title !== undefined) {
    element.title = options.title;
  }
  if (options.onClick) {
    element.addEventListener('click', options.onClick);
  }
  element.append(...children);
  return element;
}
