import { inferColumnKind } from '../../inference/inferColumnKind';
import type { ChartConfig } from '../../model/config/ChartConfig';
import type { ChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import type { ColumnKind } from '../../model/config/ColumnKind';
import { columnIndex } from '../../support/columns/columnIndex';
import { buildBoxplotData } from '../boxplot/buildBoxplotData';
import { buildCartesianData } from '../cartesian/buildCartesianData';
import { buildHeatmapData } from '../heatmap/buildHeatmapData';
import { buildHistogramData } from '../histogram/buildHistogramData';
import { buildPieData } from '../pie/buildPieData';
import { buildScatterData } from '../scatter/buildScatterData';
import { l10n } from '../../../../domain/i18n/translation/l10n';

function kindOfColumn(input: ChartInput, name: string | undefined): ColumnKind {
  const index = columnIndex(input, name);
  return index < 0 ? 'category' : inferColumnKind(input.rows.map((row) => row[index]));
}

function buildStat(input: ChartInput): ChartData {
  if (input.rows.length !== 1 || input.columns.length !== 1) {
    return { form: 'empty', reason: l10n.t('A single number needs a result with one row and one column.'), notices: [] };
  }
  return { form: 'stat', label: input.columns[0], value: input.rows[0][0] ?? 'NULL', notices: [] };
}

export function buildDataByKind(input: ChartInput, config: ChartConfig): ChartData {
  switch (config.kind) {
    case 'line':
    case 'area':
    case 'bar':
      return buildCartesianData(input, config, config.kind, kindOfColumn(input, config.x));
    case 'pie':
      return buildPieData(input, config);
    case 'scatter':
      return buildScatterData(input, config);
    case 'histogram':
      return buildHistogramData(input, config);
    case 'boxplot':
      return buildBoxplotData(input, config);
    case 'heatmap':
      return buildHeatmapData(input, config, kindOfColumn(input, config.x), kindOfColumn(input, config.group));
    case 'stat':
      return buildStat(input);
  }
}
