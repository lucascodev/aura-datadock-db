import { describe, expect, it, vi } from 'vitest';
import { buildChartData } from '../../../../src/application/charts/builders/buildChartData';
import type { ChartConfig } from '../../../../src/application/charts/model/config/ChartConfig';
import type { DrawableChartData } from '../../../../src/application/charts/model/data/ChartData';
import type { ChartCell } from '../../../../src/application/charts/model/config/ChartInput';
import { createAxisFormatter, formatAxisNumber, formatFullNumber } from '../../../../src/presentation/webview/chart/echarts/formatChartNumber';
import { toEChartsOption } from '../../../../src/presentation/webview/chart/echarts/toEChartsOption';
import type { EChartsOptionRecord } from '../../../../src/presentation/webview/chart/echarts/EChartsOptionRecord';
import { DARK_PALETTE, LIGHT_PALETTE } from '../../../../src/presentation/webview/chart/palette/chartPalettes';

function draw(columns: string[], rows: ChartCell[][], config: Partial<ChartConfig>, isExport = false, renderTooltip: (content: unknown) => unknown = (content) => content) {
  const data = buildChartData({ columns, rows, isTruncated: false }, { kind: 'bar', y: [], showRegression: false, ...config }) as DrawableChartData;
  return toEChartsOption(data, { palette: DARK_PALETTE, isExport, renderTooltip }) as EChartsOptionRecord & Record<string, any>;
}

const twoSeries: ChartCell[][] = [['a', '1', '10'], ['b', '2', '20']];
const dated: ChartCell[][] = [['2026-11-01', '1'], ['2026-11-02', '2']];
const longDated: ChartCell[][] = Array.from({ length: 40 }, (_, index) => [`2026-10-${String((index % 28) + 1).padStart(2, '0')} 0${index % 10}:00:00`, String(index)]);

describe('toEChartsOption', () => {
  it('uses one Y axis, always', () => {
    const option = draw(['x', 'a', 'b'], twoSeries, { x: 'x', y: ['a', 'b'] });
    expect(Array.isArray(option.yAxis)).toBe(false);
    expect(option.series.every((series: { yAxisIndex?: number }) => series.yAxisIndex === undefined)).toBe(true);
  });

  it('follows the mark specs for bars', () => {
    const [series] = draw(['x', 'a'], [['p', '1']], { x: 'x', y: ['a'] }).series;
    expect(series).toMatchObject({ type: 'bar', barMaxWidth: 24, itemStyle: { borderRadius: [4, 4, 0, 0] } });
  });

  it('follows the mark specs for lines and areas', () => {
    const [line] = draw(['d', 'v'], dated, { kind: 'line', x: 'd', y: ['v'] }).series;
    expect(line).toMatchObject({ type: 'line', symbol: 'circle', symbolSize: 8, lineStyle: { width: 2 }, itemStyle: { borderWidth: 2 } });
    expect(line.areaStyle).toBeUndefined();
    const [area] = draw(['d', 'v'], dated, { kind: 'area', x: 'd', y: ['v'] }).series;
    expect(area.areaStyle).toEqual({ opacity: 0.1 });
  });

  it('keeps one number style on an axis', () => {
    const option = draw(['x', 'a'], [['p', '5000'], ['q', '15000']], { x: 'x', y: ['a'] });
    expect(option.yAxis.axisLabel.formatter(5000)).toBe('5K');
    expect(option.yAxis.axisLabel.formatter(15000)).toBe('15K');
  });

  it('draws solid hairline grids', () => {
    const option = draw(['x', 'a'], [['p', '1']], { x: 'x', y: ['a'] });
    expect(option.yAxis.splitLine.lineStyle).toMatchObject({ width: 1, type: 'solid' });
  });

  it('shows a legend only from two series', () => {
    expect(draw(['x', 'a'], [['p', '1']], { x: 'x', y: ['a'] }).legend.show).toBe(false);
    expect(draw(['x', 'a', 'b'], twoSeries, { x: 'x', y: ['a', 'b'] }).legend.show).toBe(true);
  });

  it('gives a series the same place in the palette, whatever the chart', () => {
    const rows: ChartCell[][] = [['p', 'one', '1'], ['q', 'two', '2']];
    const names = (kind: ChartConfig['kind']) => draw(['x', 's', 'v'], rows, { kind, x: 'x', y: ['v'], group: 's' }).series.map((series: { name: string }) => series.name);
    expect(names('bar')).toEqual(['one', 'two']);
    expect(names('line')).toEqual(['one', 'two']);
    expect(names('area')).toEqual(['one', 'two']);
    expect(draw(['x', 's', 'v'], rows, { x: 'x', y: ['v'], group: 's' }).color).toBe(DARK_PALETTE.categorical);
  });

  it('never generates a ninth color', () => {
    const rows = Array.from({ length: 20 }, (_, index): ChartCell[] => ['x', `s${index}`, '1']);
    const option = draw(['x', 's', 'v'], rows, { x: 'x', y: ['v'], group: 's' });
    expect(option.series.length).toBeLessThanOrEqual(option.color.length);
  });

  describe('time axis', () => {
    it('uses real positions and shows dates as they came from the database', () => {
      const option = draw(['d', 'v'], dated, { kind: 'line', x: 'd', y: ['v'] });
      expect(option.xAxis.type).toBe('time');
      expect(option.useUTC).toBe(true);
      expect(option.series[0].data).toEqual([[Date.UTC(2026, 10, 1), 1], [Date.UTC(2026, 10, 2), 2]]);
    });

    it('titles the tooltip with the original text', () => {
      const option = draw(['d', 'v'], dated, { kind: 'line', x: 'd', y: ['v'] });
      const content = option.tooltip.formatter([{ dataIndex: 1, seriesName: 'v', value: [0, 2], color: '#000' }]);
      expect(content).toEqual({ title: '2026-11-02', lines: [{ label: 'v', value: '2', color: '#000' }] });
    });

    it('leaves gaps out of the tooltip', () => {
      const option = draw(['d', 'v'], dated, { kind: 'line', x: 'd', y: ['v'] });
      expect(option.tooltip.formatter([{ dataIndex: 0, seriesName: 'v', value: [0, null] }]).lines).toEqual([]);
    });
  });

  it('adds zoom only with many points, and never when exporting', () => {
    expect(draw(['d', 'v'], dated, { kind: 'line', x: 'd', y: ['v'] }).dataZoom).toEqual([]);
    expect(draw(['d', 'v'], longDated, { kind: 'line', x: 'd', y: ['v'] }).dataZoom).toHaveLength(2);
    expect(draw(['d', 'v'], longDated, { kind: 'line', x: 'd', y: ['v'] }, true).dataZoom).toEqual([]);
  });

  it('hides the markers when there are too many points', () => {
    expect(draw(['d', 'v'], longDated, { kind: 'line', x: 'd', y: ['v'] }).series[0].showSymbol).toBe(longDated.length <= 40);
  });

  it('builds tooltips through the injected renderer, never as markup', () => {
    const renderTooltip = vi.fn((content: unknown) => content);
    const option = draw(['x', 'a'], [['p', '1']], { x: 'x', y: ['a'] }, false, renderTooltip);
    const content = option.tooltip.formatter([{ axisValueLabel: 'p', seriesName: 'a', value: 1, color: '#123' }]);
    expect(renderTooltip).toHaveBeenCalledOnce();
    expect(typeof content).not.toBe('string');
  });

  describe('exporting', () => {
    it('paints its own background and has no tooltip', () => {
      const data = buildChartData({ columns: ['x', 'a'], rows: [['p', '1']], isTruncated: false }, { kind: 'bar', x: 'x', y: ['a'], showRegression: false }) as DrawableChartData;
      const option = toEChartsOption(data, { palette: LIGHT_PALETTE, isExport: true, renderTooltip: () => '' }) as Record<string, any>;
      expect(option.backgroundColor).toBe(LIGHT_PALETTE.surface);
      expect(option.tooltip.show).toBe(false);
    });

    it('stays transparent on screen, over the theme of the editor', () => {
      expect(draw(['x', 'a'], [['p', '1']], { x: 'x', y: ['a'] }).backgroundColor).toBe('transparent');
    });
  });

  describe('scatter', () => {
    const points: ChartCell[][] = [['1', '2'], ['2', '4'], ['3', '6']];

    it('draws points with a ring, and no trend line unless asked', () => {
      const { series } = draw(['x', 'y'], points, { kind: 'scatter', x: 'x', y: ['y'] });
      expect(series).toHaveLength(1);
      expect(series[0]).toMatchObject({ type: 'scatter', symbolSize: 8, itemStyle: { borderWidth: 2 } });
    });

    it('adds the trend line with its R², in a text color', () => {
      const option = draw(['x', 'y'], points, { kind: 'scatter', x: 'x', y: ['y'], showRegression: true });
      const trend = option.series.at(-1);
      expect(trend).toMatchObject({ type: 'line', symbol: 'none', name: 'Linear fit (R² = 1.000)', data: [[1, 2], [3, 6]] });
      expect(trend.lineStyle.color).toBe(DARK_PALETTE.mutedText);
      expect(option.legend.show).toBe(true);
    });
  });

  describe('heatmap', () => {
    const rows: ChartCell[][] = [['a', 'p', '1'], ['b', 'q', '5']];

    it('uses a single-hue ramp with a scale legend', () => {
      const option = draw(['x', 'y', 'v'], rows, { kind: 'heatmap', x: 'x', y: ['v'], group: 'y' });
      expect(option.visualMap).toMatchObject({ min: 1, max: 5, inRange: { color: DARK_PALETTE.sequential } });
      expect(option.series[0].data).toEqual([[0, 0, 1], [1, 1, 5]]);
    });

    it('does not break when every value is the same', () => {
      const option = draw(['x', 'y', 'v'], [['a', 'p', '3'], ['b', 'q', '3']], { kind: 'heatmap', x: 'x', y: ['v'], group: 'y' });
      expect(option.visualMap.max).toBeGreaterThan(option.visualMap.min);
    });
  });

  describe('box plot', () => {
    const rows: ChartCell[][] = [...Array.from({ length: 9 }, (_, index): ChartCell[] => [String(index + 1), 'a']), ['100', 'a'], ['5', 'b']];

    it('draws whiskers and quartiles in the order ECharts expects, and outliers apart', () => {
      const { series } = draw(['v', 'g'], rows, { kind: 'boxplot', y: ['v'], group: 'g' });
      expect(series[0].type).toBe('boxplot');
      expect(series[0].data[0]).toHaveLength(5);
      expect(series[0].data[0][0]).toBeLessThanOrEqual(series[0].data[0][4]);
      expect(series[1].data).toEqual([[0, 100]]);
    });

    it('describes a group and an outlier in the tooltip', () => {
      const option = draw(['v', 'g'], rows, { kind: 'boxplot', y: ['v'], group: 'g' });
      expect(option.tooltip.formatter({ seriesName: 'v', dataIndex: 1 }).title).toBe('b');
      expect(option.tooltip.formatter({ seriesName: 'Outliers', value: [0, 100] })).toEqual({ title: 'a', lines: [{ label: 'Outlier', value: '100' }] });
    });
  });

  it('counts rows on the Y axis of a histogram', () => {
    const option = draw(['v'], [['1'], ['2'], ['3']], { kind: 'histogram', y: ['v'], binCount: 2 });
    expect(option.yAxis.name).toBe('Rows');
    expect(option.series[0].data).toEqual([1, 2]);
    expect(option.xAxis.data).toHaveLength(2);
  });

  it('rounds the labels of a histogram to the size of its bins', () => {
    const wide = draw(['v'], [['50'], ['78.0513'], ['106.1026']], { kind: 'histogram', y: ['v'], binCount: 2 });
    expect(wide.xAxis.data).toEqual(['50 – 78', '78 – 106']);
    const narrow = draw(['v'], [['0.12'], ['0.15'], ['0.18']], { kind: 'histogram', y: ['v'], binCount: 2 });
    expect(narrow.xAxis.data).toEqual(['0.12 – 0.15', '0.15 – 0.18']);
  });

  it('labels only the large slices of a pie, with text colors', () => {
    const option = draw(['n', 'v'], [['big', '99'], ['tiny', '1']], { kind: 'pie', x: 'n', y: ['v'] });
    const { label, data } = option.series[0];
    expect(label.color).toBe(DARK_PALETTE.text);
    expect(label.formatter({ name: 'big', percent: 99 })).toBe('big 99%');
    expect(data[0]).toEqual({ name: 'big', value: 99 });
    expect(data[1]).toEqual({ name: 'tiny', value: 1, label: { show: false }, labelLine: { show: false } });
  });
});

describe('number formats', () => {
  it.each([[0, '0'], [1234.5678, '1,234.5678'], [9999, '9,999'], [10_000, '10K'], [2_500_000, '2.5M'], [-20_000, '-20K']])('shows %d on an axis as %s', (value, expected) => {
    expect(formatAxisNumber(value)).toBe(expected);
  });

  it('uses one style across an axis, decided by its largest value', () => {
    const compact = createAxisFormatter([0, 15_000]);
    expect([compact(0), compact(5000), compact(10_000)]).toEqual(['0', '5K', '10K']);
    const full = createAxisFormatter([0, 9000]);
    expect([full(0), full(5000), full(9000)]).toEqual(['0', '5,000', '9,000']);
  });

  it('keeps full numbers in tooltips', () => {
    expect(formatFullNumber(2_500_000)).toBe('2,500,000');
  });
});

describe('palettes', () => {
  it('has the eight validated slots in each mode', () => {
    expect(LIGHT_PALETTE.categorical).toHaveLength(8);
    expect(DARK_PALETTE.categorical).toHaveLength(8);
    expect(new Set(LIGHT_PALETTE.categorical).size).toBe(8);
  });
});
