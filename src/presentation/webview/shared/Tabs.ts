import { createElement } from './createElement';

export interface TabDefinition<TabId extends string> {
  readonly id: TabId;
  readonly label: string;
  readonly content: readonly HTMLElement[];
}

interface RenderedTab {
  readonly label: string;
  readonly button: HTMLButtonElement;
  readonly panel: HTMLElement;
}

export class Tabs<TabId extends string> {
  readonly element: HTMLElement;
  private readonly tabs: ReadonlyMap<TabId, RenderedTab>;
  private readonly order: readonly TabId[];

  constructor(
    definitions: readonly TabDefinition<TabId>[],
    private readonly onSelect?: (id: TabId) => void,
  ) {
    this.order = definitions.map((definition) => definition.id);
    this.tabs = new Map(definitions.map((definition) => [definition.id, this.renderTab(definition)]));

    const tabList = createElement('div', { className: 'tab-list' }, [...this.tabs.values()].map((tab) => tab.button));
    tabList.setAttribute('role', 'tablist');
    tabList.addEventListener('keydown', (event) => this.handleKeyDown(event));

    this.element = createElement('div', { className: 'tabs' }, [tabList, ...[...this.tabs.values()].map((tab) => tab.panel)]);
    this.select(this.order[0]);
  }

  select(id: TabId): void {
    for (const [tabId, tab] of this.tabs) {
      const isSelected = tabId === id;
      tab.button.setAttribute('aria-selected', String(isSelected));
      tab.button.tabIndex = isSelected ? 0 : -1;
      tab.button.classList.toggle('active', isSelected);
      tab.panel.hidden = !isSelected;
    }
    this.onSelect?.(id);
  }

  markErrors(ids: ReadonlySet<TabId>): void {
    for (const [tabId, tab] of this.tabs) {
      tab.button.classList.toggle('has-error', ids.has(tabId));
    }
  }

  setBadge(id: TabId, badge: string): void {
    const tab = this.tabs.get(id);
    if (tab) {
      tab.button.textContent = badge ? `${tab.label} · ${badge}` : tab.label;
    }
  }

  private renderTab({ id, label, content }: TabDefinition<TabId>): RenderedTab {
    const button = createElement('button', { className: 'tab', text: label, onClick: () => this.select(id) });
    button.type = 'button';
    button.id = `tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `panel-${id}`);

    const panel = createElement('div', { className: 'tab-panel' }, content);
    panel.id = `panel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    return { label, button, panel };
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const currentIndex = this.order.findIndex((id) => this.tabs.get(id)?.button.getAttribute('aria-selected') === 'true');
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = this.order[(currentIndex + step + this.order.length) % this.order.length];
    this.select(next);
    this.tabs.get(next)?.button.focus();
  }
}
