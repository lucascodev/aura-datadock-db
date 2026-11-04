import type { DrawableChartData } from '../../../../../../application/charts/model/data/ChartData';
import type { EChartsOptionRecord } from '../../../model/EChartsOptionRecord';
import type { OptionContext } from '../../../model/OptionContext';
import { toBoxplotOption } from '../boxplot/toBoxplotOption';
import { toCartesianOption } from '../cartesian/toCartesianOption';
import { toHeatmapOption } from '../heatmap/toHeatmapOption';
import { toHistogramOption } from '../histogram/toHistogramOption';
import { toPieOption } from '../pie/toPieOption';
import { toScatterOption } from '../scatter/toScatterOption';

export function toEChartsOption(data: DrawableChartData, context: OptionContext): EChartsOptionRecord {
  switch (data.form) {
    case 'cartesian':
      return toCartesianOption(context, data);
    case 'pie':
      return toPieOption(context, data);
    case 'scatter':
      return toScatterOption(context, data);
    case 'histogram':
      return toHistogramOption(context, data);
    case 'boxplot':
      return toBoxplotOption(context, data);
    case 'heatmap':
      return toHeatmapOption(context, data);
  }
}
