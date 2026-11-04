import type {
  BoxplotChartData,
  CartesianChartData,
  DrawableChartData,
  HeatmapChartData,
  HistogramChartData,
  PieChartData,
  ScatterChartData,
} from '../../../../application/charts/model/data/ChartData';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { ChartPalette } from '../model/ChartPalette';
import { createAxisFormatter, formatAxisNumber, formatBinEdge, formatFullNumber } from './formatChartNumber';
import type { TooltipContent } from '../model/TooltipContent';
import type { EChartsOptionRecord } from '../model/EChartsOptionRecord';

const BAR_MAX_WIDTH = 24;
const BAR_RADIUS = [4, 4, 0, 0];
const LINE_WIDTH = 2;
const MARKER_SIZE = 8;
const RING_WIDTH = 2;
const AREA_OPACITY = 0.1;
const MARKERS_UP_TO_POINTS = 40;
const ZOOM_FROM_POINTS = 30;
const SAMPLE_FROM_POINTS = 2000;
const LARGE_SCATTER_POINTS = 5000;
const OVERLAP_OPACITY = 0.85;
const LEGEND_FROM_SERIES = 2;
const MIN_LABELED_SHARE = 5;
const DEFAULT_LEFT_MARGIN = 16;

interface OptionContext {
  readonly palette: ChartPalette;
  readonly isExport: boolean;
  renderTooltip(content: TooltipContent): unknown;
}

interface TooltipParam {
  readonly seriesName?: string;
  readonly name?: string;
  readonly value?: unknown;
  readonly data?: unknown;
  readonly color?: string;
  readonly percent?: number;
  readonly dataIndex?: number;
  readonly axisValueLabel?: string;
}

function asParams(params: unknown): readonly TooltipParam[] {
  return Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam];
}

function base(context: OptionContext, extra: EChartsOptionRecord): EChartsOptionRecord {
  const { palette, isExport } = context;
  return {
    animation: false,
    backgroundColor: isExport ? palette.surface : 'transparent',
    color: palette.categorical,
    textStyle: { color: palette.text, fontFamily: palette.fontFamily },
    ...extra,
  };
}

function tooltip(context: OptionContext, trigger: 'axis' | 'item', build: (params: readonly TooltipParam[]) => TooltipContent): EChartsOptionRecord {
  const { palette, isExport } = context;
  return {
    show: !isExport,
    trigger,
    confine: true,
    backgroundColor: palette.surface,
    borderColor: palette.baseline,
    borderWidth: 1,
    padding: 8,
    extraCssText: 'box-shadow: none;',
    axisPointer: { type: trigger === 'axis' ? 'line' : 'none', lineStyle: { color: palette.baseline, width: 1 } },
    formatter: (params: unknown) => context.renderTooltip(build(asParams(params))),
  };
}

function legend(context: OptionContext, names: readonly string[]): EChartsOptionRecord {
  const { palette } = context;
  return {
    show: names.length >= LEGEND_FROM_SERIES,
    top: 0,
    type: 'scroll',
    data: names,
    textStyle: { color: palette.text },
    pageTextStyle: { color: palette.mutedText },
    pageIconColor: palette.text,
    pageIconInactiveColor: palette.baseline,
  };
}

function grid(hasLegend: boolean, hasZoom: boolean): EChartsOptionRecord {
  return { left: DEFAULT_LEFT_MARGIN, right: 24, top: hasLegend ? 36 : 16, bottom: hasZoom ? 56 : 24, containLabel: true };
}

function axis(context: OptionContext, type: string, name: string, extra: EChartsOptionRecord = {}): EChartsOptionRecord {
  const { palette } = context;
  return {
    type,
    name,
    nameLocation: 'middle',
    nameGap: type === 'category' || type === 'time' ? 28 : 44,
    nameTextStyle: { color: palette.mutedText },
    axisLine: { show: true, lineStyle: { color: palette.baseline, width: 1 } },
    axisTick: { show: false },
    axisLabel: { color: palette.mutedText, hideOverlap: true },
    splitLine: { show: type === 'value', lineStyle: { color: palette.grid, width: 1, type: 'solid' } },
    ...extra,
  };
}

function valueLabels(context: OptionContext, values: readonly number[]): EChartsOptionRecord {
  return { axisLabel: { color: context.palette.mutedText, hideOverlap: true, formatter: createAxisFormatter(values) } };
}

function zoom(context: OptionContext, pointCount: number): EChartsOptionRecord[] {
  const { palette, isExport } = context;
  if (isExport || pointCount <= ZOOM_FROM_POINTS) {
    return [];
  }
  return [
    { type: 'inside' },
    { type: 'slider', height: 18, bottom: 8, borderColor: palette.baseline, textStyle: { color: palette.mutedText }, fillerColor: 'rgba(128, 128, 128, 0.15)', dataBackground: { lineStyle: { color: palette.baseline }, areaStyle: { color: palette.grid } } },
  ];
}

function ring(context: OptionContext): EChartsOptionRecord {
  return { borderColor: context.palette.surface, borderWidth: RING_WIDTH };
}

function cartesianSeries(context: OptionContext, data: CartesianChartData): EChartsOptionRecord[] {
  const pointCount = data.categories.length;
  return data.series.map((series) => {
    const values = data.positions ? series.values.map((value, index) => [data.positions?.[index], value]) : series.values;
    if (data.seriesKind === 'bar') {
      return { type: 'bar', name: series.name, data: values, barMaxWidth: BAR_MAX_WIDTH, itemStyle: { borderRadius: BAR_RADIUS } };
    }
    return {
      type: 'line',
      name: series.name,
      data: values,
      connectNulls: false,
      symbol: 'circle',
      showSymbol: pointCount <= MARKERS_UP_TO_POINTS,
      symbolSize: MARKER_SIZE,
      lineStyle: { width: LINE_WIDTH, cap: 'round', join: 'round' },
      itemStyle: ring(context),
      sampling: pointCount > SAMPLE_FROM_POINTS ? 'lttb' : undefined,
      ...(data.seriesKind === 'area' ? { areaStyle: { opacity: AREA_OPACITY } } : {}),
    };
  });
}

function cartesianValue(value: unknown): unknown {
  return Array.isArray(value) ? value[1] : value;
}

function toCartesianOption(context: OptionContext, data: CartesianChartData): EChartsOptionRecord {
  const names = data.series.map((series) => series.name);
  const hasLegend = names.length >= LEGEND_FROM_SERIES;
  const dataZoom = zoom(context, data.categories.length);
  const xExtra = data.axisType === 'category' ? { data: data.categories, boundaryGap: data.seriesKind === 'bar' } : { scale: data.axisType === 'value' };
  return base(context, {
    legend: legend(context, names),
    grid: grid(hasLegend, dataZoom.length > 0),
    dataZoom,
    useUTC: true,
    xAxis: axis(context, data.axisType, data.xName, data.axisType === 'value' ? { ...xExtra, ...valueLabels(context, data.positions ?? []) } : xExtra),
    yAxis: axis(context, 'value', names.length === 1 ? data.yName : '', valueLabels(context, data.series.flatMap((series) => series.values.filter((value) => value !== null)))),
    tooltip: tooltip(context, 'axis', (params) => ({
      title: data.positions ? data.categories[params[0]?.dataIndex ?? 0] : params[0]?.axisValueLabel,
      lines: params.flatMap((param) => {
        const value = cartesianValue(param.value);
        return typeof value === 'number' ? [{ label: param.seriesName ?? '', value: formatFullNumber(value), color: param.color }] : [];
      }),
    })),
    series: cartesianSeries(context, data),
  });
}

function toPieOption(context: OptionContext, data: PieChartData): EChartsOptionRecord {
  const { palette } = context;
  const names = data.slices.map((slice) => slice.name);
  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);
  const isLabeled = (value: number) => (value / total) * 100 >= MIN_LABELED_SHARE;
  return base(context, {
    legend: legend(context, names),
    tooltip: tooltip(context, 'item', ([param]) => ({
      title: param?.name,
      lines: [{ label: data.valueName, value: `${formatFullNumber(param?.value as number)} (${formatFullNumber(param?.percent ?? 0)}%)`, color: param?.color }],
    })),
    series: [
      {
        type: 'pie',
        name: data.valueName,
        radius: ['0%', '68%'],
        center: ['50%', '54%'],
        data: data.slices.map((slice) => (isLabeled(slice.value) ? slice : { ...slice, label: { show: false }, labelLine: { show: false } })),
        itemStyle: { borderColor: palette.surface, borderWidth: RING_WIDTH },
        label: { color: palette.text, formatter: (param: TooltipParam) => `${param.name} ${formatFullNumber(param.percent ?? 0)}%` },
        labelLine: { lineStyle: { color: palette.baseline } },
      },
    ],
  });
}

function toScatterOption(context: OptionContext, data: ScatterChartData): EChartsOptionRecord {
  const { palette } = context;
  const pointCount = data.series.reduce((sum, series) => sum + series.points.length, 0);
  const trendName = data.regression ? l10n.t('Linear fit (R² = {0})', data.regression.rSquared.toFixed(3)) : undefined;
  const names = [...data.series.map((series) => series.name), ...(trendName ? [trendName] : [])];
  const scatter = data.series.map((series) => ({
    type: 'scatter',
    name: series.name,
    data: series.points,
    symbolSize: MARKER_SIZE,
    large: pointCount > LARGE_SCATTER_POINTS,
    itemStyle: { ...ring(context), opacity: OVERLAP_OPACITY },
  }));
  const trend = data.regression && trendName
    ? [{ type: 'line', name: trendName, data: [data.regression.from, data.regression.to], symbol: 'none', silent: true, color: palette.mutedText, lineStyle: { width: LINE_WIDTH, color: palette.mutedText } }]
    : [];
  return base(context, {
    legend: legend(context, names),
    grid: grid(names.length >= LEGEND_FROM_SERIES, false),
    xAxis: axis(context, 'value', data.xName, { scale: true, ...valueLabels(context, data.series.flatMap((series) => series.points.map(([x]) => x))) }),
    yAxis: axis(context, 'value', data.yName, { scale: true, ...valueLabels(context, data.series.flatMap((series) => series.points.map(([, y]) => y))) }),
    tooltip: tooltip(context, 'item', ([param]) => {
      const [x, y] = param?.value as [number, number];
      return {
        title: param?.seriesName,
        lines: [
          { label: data.xName, value: formatFullNumber(x) },
          { label: data.yName, value: formatFullNumber(y) },
        ],
      };
    }),
    series: [...scatter, ...trend],
  });
}

function binLabel(from: number, to: number): string {
  const width = to - from;
  return from === to ? formatFullNumber(from) : `${formatBinEdge(from, width)} – ${formatBinEdge(to, width)}`;
}

function toHistogramOption(context: OptionContext, data: HistogramChartData): EChartsOptionRecord {
  return base(context, {
    grid: grid(false, false),
    xAxis: axis(context, 'category', data.valueName, { data: data.bins.map((bin) => binLabel(bin.from, bin.to)) }),
    yAxis: axis(context, 'value', l10n.t('Rows'), valueLabels(context, data.bins.map((bin) => bin.count))),
    tooltip: tooltip(context, 'axis', ([param]) => ({
      title: param?.axisValueLabel,
      lines: [{ label: l10n.t('Rows'), value: formatFullNumber(param?.value as number), color: param?.color }],
    })),
    series: [{ type: 'bar', name: l10n.t('Rows'), data: data.bins.map((bin) => bin.count), barCategoryGap: '4%', itemStyle: { borderRadius: BAR_RADIUS } }],
  });
}

function toBoxplotOption(context: OptionContext, data: BoxplotChartData): EChartsOptionRecord {
  const { palette } = context;
  const color = palette.categorical[0];
  const outliersName = l10n.t('Outliers');
  const outliers = data.groups.flatMap((group, index) => group.stats.outliers.map((value) => [index, value]));
  return base(context, {
    grid: grid(false, false),
    xAxis: axis(context, 'category', data.groupName ?? '', { data: data.groups.map((group) => group.name) }),
    yAxis: axis(context, 'value', data.valueName, { scale: true, ...valueLabels(context, data.groups.flatMap(({ stats }) => [stats.lowerWhisker, stats.upperWhisker, ...stats.outliers])) }),
    tooltip: tooltip(context, 'item', ([param]) => {
      const group = data.groups[param?.seriesName === outliersName ? (param.value as number[])[0] : param?.dataIndex ?? 0];
      if (param?.seriesName === outliersName) {
        return { title: group?.name, lines: [{ label: l10n.t('Outlier'), value: formatFullNumber((param.value as number[])[1]) }] };
      }
      const stats = group?.stats;
      return {
        title: group?.name,
        lines: stats
          ? [
              { label: l10n.t('Upper whisker'), value: formatFullNumber(stats.upperWhisker) },
              { label: l10n.t('Q3'), value: formatFullNumber(stats.q3) },
              { label: l10n.t('Median'), value: formatFullNumber(stats.median) },
              { label: l10n.t('Q1'), value: formatFullNumber(stats.q1) },
              { label: l10n.t('Lower whisker'), value: formatFullNumber(stats.lowerWhisker) },
              { label: l10n.t('Rows'), value: formatFullNumber(stats.count) },
            ]
          : [],
      };
    }),
    series: [
      {
        type: 'boxplot',
        name: data.valueName,
        boxWidth: [8, BAR_MAX_WIDTH],
        itemStyle: { color: 'transparent', borderColor: color, borderWidth: LINE_WIDTH },
        data: data.groups.map(({ stats }) => [stats.lowerWhisker, stats.q1, stats.median, stats.q3, stats.upperWhisker]),
      },
      { type: 'scatter', name: outliersName, data: outliers, symbolSize: MARKER_SIZE, itemStyle: { ...ring(context), color } },
    ],
  });
}

function toHeatmapOption(context: OptionContext, data: HeatmapChartData): EChartsOptionRecord {
  const { palette } = context;
  return base(context, {
    grid: { left: DEFAULT_LEFT_MARGIN, right: 24, top: 16, bottom: 76, containLabel: true },
    xAxis: axis(context, 'category', data.xName, { data: data.xCategories, splitArea: { show: false } }),
    yAxis: axis(context, 'category', data.yName, { data: data.yCategories, nameGap: 56, splitArea: { show: false } }),
    visualMap: {
      min: data.min,
      max: data.max === data.min ? data.min + 1 : data.max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      itemHeight: 160,
      itemWidth: 12,
      formatter: (value: number) => formatAxisNumber(value),
      text: [data.valueName, ''],
      textStyle: { color: palette.mutedText },
      inRange: { color: palette.sequential },
    },
    tooltip: tooltip(context, 'item', ([param]) => {
      const [xIndex, yIndex, value] = param?.value as [number, number, number];
      return {
        title: `${data.xCategories[xIndex]} · ${data.yCategories[yIndex]}`,
        lines: [{ label: data.valueName, value: formatFullNumber(value) }],
      };
    }),
    series: [{ type: 'heatmap', name: data.valueName, data: data.cells, itemStyle: { borderColor: palette.surface, borderWidth: RING_WIDTH } }],
  });
}

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
