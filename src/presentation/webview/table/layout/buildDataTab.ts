import { createElement } from '../../shared/dom/createElement';

interface DataTabParts {
  readonly filterBar: HTMLElement;
  readonly noticeBanner: HTMLElement;
  readonly customBanner: HTMLElement;
  readonly statusLine: HTMLElement;
  readonly modeButtons: readonly HTMLElement[];
  readonly grid: HTMLElement;
  readonly textView: HTMLElement;
  readonly recordView: HTMLElement;
  readonly valuePanel: HTMLElement;
  readonly bottomBar: HTMLElement;
  readonly sqlPanel: HTMLElement;
}

export function buildDataTab(parts: DataTabParts): HTMLElement {
  return createElement('div', { className: 'data-tab' }, [
    parts.filterBar,
    parts.noticeBanner,
    parts.customBanner,
    parts.statusLine,
    createElement('div', { className: 'data-body' }, [
      createElement('div', { className: 'mode-rail' }, parts.modeButtons),
      createElement('div', { className: 'data-content' }, [parts.grid, parts.textView, parts.recordView]),
      parts.valuePanel,
    ]),
    parts.bottomBar,
    parts.sqlPanel,
  ]);
}
