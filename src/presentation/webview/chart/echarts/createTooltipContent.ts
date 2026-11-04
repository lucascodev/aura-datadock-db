import type { TooltipContent } from '../model/TooltipContent';

export function createTooltipContent(content: TooltipContent): HTMLElement {
  const root = document.createElement('div');
  root.className = 'chart-tooltip';
  if (content.title) {
    const title = document.createElement('div');
    title.className = 'chart-tooltip-title';
    title.textContent = content.title;
    root.append(title);
  }
  for (const line of content.lines) {
    const row = document.createElement('div');
    row.className = 'chart-tooltip-row';
    if (line.color) {
      const swatch = document.createElement('span');
      swatch.className = 'chart-tooltip-swatch';
      swatch.style.background = line.color;
      row.append(swatch);
    }
    const label = document.createElement('span');
    label.className = 'chart-tooltip-label';
    label.textContent = line.label;
    const value = document.createElement('span');
    value.className = 'chart-tooltip-value';
    value.textContent = line.value;
    row.append(label, value);
    root.append(row);
  }
  return root;
}
