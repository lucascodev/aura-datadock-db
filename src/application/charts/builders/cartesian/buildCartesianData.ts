import type { ChartConfig } from '../../model/config/ChartConfig';
import type { CartesianAxisType, CartesianChartData, CartesianSeriesKind, EmptyChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import type { ColumnKind } from '../../model/config/ColumnKind';
import { MAX_CARTESIAN_SERIES } from '../../constants/cartesianLimits';
import { axisPosition } from '../../support/axis/axisPosition';
import { orderLabels } from '../../support/axis/orderLabels';
import { moveOtherLast } from '../../support/folding/moveOtherLast';
import { tallyNotices } from '../../support/tally/tallyNotices';
import { accumulateCartesianSeries } from './accumulateCartesianSeries';
import { l10n } from '../../../../domain/i18n/translation/l10n';

function axisTypeFor(seriesKind: CartesianSeriesKind, xKind: ColumnKind): CartesianAxisType {
  if (seriesKind === 'bar' || xKind === 'category') {
    return 'category';
  }
  return xKind === 'temporal' ? 'time' : 'value';
}

export function buildCartesianData(input: ChartInput, config: ChartConfig, seriesKind: CartesianSeriesKind, xKind: ColumnKind): CartesianChartData | EmptyChartData {
  const allY = config.group ? config.y.slice(0, 1) : config.y;
  const yNames = allY.slice(0, MAX_CARTESIAN_SERIES);
  const { series, labels, tally } = accumulateCartesianSeries(input, config, yNames);
  if (labels.size === 0) {
    return { form: 'empty', reason: l10n.t('No row has values that can be drawn with these columns.'), notices: tallyNotices(tally) };
  }

  const categories = orderLabels(xKind, [...labels]);
  const axisType = axisTypeFor(seriesKind, xKind);
  const omittedY = allY.length - yNames.length;
  const omittedNotice = omittedY > 0 ? [{ kind: 'folded' as const, message: l10n.t('Only the first {0} numeric columns are drawn; {1} left out.', MAX_CARTESIAN_SERIES, omittedY) }] : [];
  return {
    form: 'cartesian',
    seriesKind,
    axisType,
    xName: config.x ?? '',
    yName: yNames.join(', '),
    categories,
    positions: axisType === 'category' ? undefined : categories.map((label) => axisPosition(xKind, label) ?? 0),
    series: moveOtherLast([...series.keys()]).map((name) => ({ name, values: categories.map((label) => series.get(name)?.get(label) ?? null) })),
    notices: [...tallyNotices(tally), ...omittedNotice],
  };
}
