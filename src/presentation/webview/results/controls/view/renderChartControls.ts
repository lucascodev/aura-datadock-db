import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { createElement } from '../../../shared/dom/createElement';
import type { ChartControlsCallbacks } from '../model/ChartControlsCallbacks';
import type { ChartControlsState } from '../model/ChartControlsState';
import { createFields } from './createFields';

export function renderChartControls(state: ChartControlsState, callbacks: ChartControlsCallbacks): HTMLElement {
  const { config } = state;
  const fields = createFields(state, callbacks, (change) => callbacks.onConfigChange({ ...config, ...change }));

  const exportButtons = (['png', 'svg'] as const).map((format) => {
    const button = createElement('button', { className: 'secondary', text: format.toUpperCase(), title: l10n.t('Save this chart as {0}', format.toUpperCase()), onClick: () => callbacks.onExport(format) });
    button.disabled = !state.canExport;
    return button;
  });

  return createElement('div', { className: 'chart-controls' }, [...fields, createElement('span', { className: 'spacer-flex' }), ...exportButtons]);
}
