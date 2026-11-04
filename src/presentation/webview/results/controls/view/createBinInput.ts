import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { createElement } from '../../../shared/dom/createElement';
import type { ChartConfigUpdate } from '../model/ChartConfigUpdate';

const MIN_BINS = 1;

export function createBinInput(config: ChartConfig, update: ChartConfigUpdate): HTMLElement {
  const input = createElement('input', { className: 'chart-bins', title: l10n.t('Leave empty to choose automatically') });
  input.type = 'number';
  input.min = String(MIN_BINS);
  input.placeholder = l10n.t('Auto');
  input.value = config.binCount ? String(config.binCount) : '';
  input.addEventListener('change', () => {
    const value = Number(input.value);
    update({ binCount: input.value && value >= MIN_BINS ? value : undefined });
  });
  return input;
}
