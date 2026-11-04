import type { ChartConfig } from '../../../../../application/charts/model/config/ChartConfig';
import { createElement } from '../../../shared/dom/createElement';
import { NO_COLUMN } from '../../constants/noColumn';
import type { ChartConfigUpdate } from '../model/ChartConfigUpdate';
import { createField } from './createField';
import { createSelect } from './createSelect';
import { createToggle } from './createToggle';
import { toOption } from './toOption';

export function createMeasures(numbers: readonly string[], config: ChartConfig, update: ChartConfigUpdate): HTMLElement {
  if (config.group) {
    return createField('Y', createSelect(numbers.map(toOption), config.y[0] ?? NO_COLUMN, (value) => update({ y: [value] })));
  }
  const toggles = numbers.map((name) =>
    createToggle(name, config.y.includes(name), (isOn) => {
      const chosen = isOn ? [...config.y, name] : config.y.filter((other) => other !== name);
      update({ y: numbers.filter((other) => chosen.includes(other)) });
    }),
  );
  return createElement('div', { className: 'chart-field' }, [createElement('span', { className: 'chart-field-label', text: 'Y' }), ...toggles]);
}
