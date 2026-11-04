import { inferColumnKind } from '../inference/inferColumnKind';
import { getChartKind } from '../model/chartKinds';
import type { ChartConfig } from '../model/ChartConfig';
import type { ChartData } from '../model/ChartData';
import type { ChartInput } from '../model/ChartInput';
import type { ChartNotice } from '../model/ChartNotice';
import type { ColumnKind } from '../model/ColumnKind';
import { columnIndex } from '../support/columnAccess';
import { buildBoxplotData } from './buildBoxplotData';
import { buildCartesianData } from './buildCartesianData';
import { buildHeatmapData } from './buildHeatmapData';
import { buildHistogramData } from './buildHistogramData';
import { buildPieData } from './buildPieData';
import { buildScatterData } from './buildScatterData';
import { l10n } from '../../../domain/i18n/translation/l10n';

function truncatedNotice(): ChartNotice {
  return {
    kind: 'truncated',
    message: l10n.t('This chart shows only part of the result, because the query returned more rows than auraDataDockDb.maxRows. Aggregate with GROUP BY, or raise the setting.'),
  };
}

function missingColumnReason(input: ChartInput, config: ChartConfig): string | undefined {
  const definition = getChartKind(config.kind);
  if (definition.x !== 'none' && columnIndex(input, config.x) < 0) {
    return l10n.t('Choose a column for the X axis.');
  }
  if (definition.y !== 'none' && (config.y.length === 0 || config.y.some((name) => columnIndex(input, name) < 0))) {
    return l10n.t('Choose a numeric column to draw. If there is none, the query needs one, such as count(*).');
  }
  return definition.group === 'required' && columnIndex(input, config.group) < 0 ? l10n.t('Choose a column for {0}.', definition.groupLabel()) : undefined;
}

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

function buildByKind(input: ChartInput, config: ChartConfig): ChartData {
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

export function buildChartData(input: ChartInput, config: ChartConfig): ChartData {
  if (input.rows.length === 0) {
    return { form: 'empty', reason: l10n.t('The query returned no rows.'), notices: [] };
  }
  const reason = missingColumnReason(input, config);
  const data: ChartData = reason ? { form: 'empty', reason, notices: [] } : buildByKind(input, config);
  return input.isTruncated ? { ...data, notices: [truncatedNotice(), ...data.notices] } : data;
}
