import { getChartKind } from '../../support/kinds/getChartKind';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { ChartInput } from '../../model/config/ChartInput';
import { columnIndex } from '../../support/columns/columnIndex';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export function missingColumnReason(input: ChartInput, config: ChartConfig): string | undefined {
  const definition = getChartKind(config.kind);
  if (definition.x !== 'none' && columnIndex(input, config.x) < 0) {
    return l10n.t('Choose a column for the X axis.');
  }
  if (definition.y !== 'none' && (config.y.length === 0 || config.y.some((name) => columnIndex(input, name) < 0))) {
    return l10n.t('Choose a numeric column to draw. If there is none, the query needs one, such as count(*).');
  }
  return definition.group === 'required' && columnIndex(input, config.group) < 0 ? l10n.t('Choose a column for {0}.', definition.groupLabel()) : undefined;
}
