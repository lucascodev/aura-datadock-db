import { describe, expect, it } from 'vitest';
import { buildChartData } from '../../../../src/application/charts/builders/buildChartData';
import type { ChartConfig } from '../../../../src/application/charts/model/config/ChartConfig';
import type { ChartData } from '../../../../src/application/charts/model/data/ChartData';
import type { ChartCell, ChartInput } from '../../../../src/application/charts/model/config/ChartInput';
import type { ChartNoticeKind } from '../../../../src/application/charts/model/data/ChartNotice';

function input(columns: string[], rows: ChartCell[][], isTruncated = false): ChartInput {
  return { columns, rows, isTruncated };
}

function config(overrides: Partial<ChartConfig>): ChartConfig {
  return { kind: 'bar', y: [], showRegression: false, ...overrides };
}

function narrow<Form extends ChartData['form']>(data: ChartData, form: Form): Extract<ChartData, { form: Form }> {
  expect(data.form).toBe(form);
  return data as Extract<ChartData, { form: Form }>;
}

const noticeKinds = (data: ChartData): ChartNoticeKind[] => data.notices.map((notice) => notice.kind);

describe('buildChartData', () => {
  describe('bars and lines', () => {
    const sales = input(['status', 'total', 'cost'], [['paid', '10', '4'], ['open', '5', '2']]);

    it('keeps the order of the query on a category axis', () => {
      const data = narrow(buildChartData(sales, config({ x: 'status', y: ['total'] })), 'cartesian');
      expect(data.categories).toEqual(['paid', 'open']);
      expect(data.axisType).toBe('category');
      expect(data.series).toEqual([{ name: 'total', values: [10, 5] }]);
      expect(data.notices).toEqual([]);
    });

    it('draws several measures as series of a single axis', () => {
      const data = narrow(buildChartData(sales, config({ x: 'status', y: ['total', 'cost'] })), 'cartesian');
      expect(data.series.map((series) => series.name)).toEqual(['total', 'cost']);
      expect(data.yName).toBe('total, cost');
    });

    it('orders dates on a time axis, whatever the order of the rows', () => {
      const rows = input(['day', 'total'], [['2026-11-03', '3'], ['2026-11-01', '1'], ['2026-11-02', '2']]);
      const data = narrow(buildChartData(rows, config({ kind: 'line', x: 'day', y: ['total'] })), 'cartesian');
      expect(data.axisType).toBe('time');
      expect(data.categories).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
      expect(data.series[0].values).toEqual([1, 2, 3]);
      expect(data.positions).toEqual([Date.UTC(2026, 10, 1), Date.UTC(2026, 10, 2), Date.UTC(2026, 10, 3)]);
    });

    it('draws bars over dates on a category axis', () => {
      const rows = input(['day', 'total'], [['2026-11-02', '2'], ['2026-11-01', '1']]);
      const data = narrow(buildChartData(rows, config({ kind: 'bar', x: 'day', y: ['total'] })), 'cartesian');
      expect(data.axisType).toBe('category');
      expect(data.categories).toEqual(['2026-11-01', '2026-11-02']);
    });

    it('uses a value axis for a numeric X in a line', () => {
      const rows = input(['n', 'v'], [['10', '1'], ['2', '5']]);
      const data = narrow(buildChartData(rows, config({ kind: 'line', x: 'n', y: ['v'] })), 'cartesian');
      expect(data.axisType).toBe('value');
      expect(data.categories).toEqual(['2', '10']);
    });

    it('splits one measure into series, with gaps where a series has no value', () => {
      const rows = input(['day', 'status', 'total'], [['2026-11-01', 'paid', '1'], ['2026-11-01', 'open', '2'], ['2026-11-02', 'paid', '3']]);
      const data = narrow(buildChartData(rows, config({ kind: 'line', x: 'day', y: ['total'], group: 'status' })), 'cartesian');
      expect(data.series).toEqual([{ name: 'paid', values: [1, 3] }, { name: 'open', values: [2, null] }]);
    });
  });

  describe('notices', () => {
    it('warns that a truncated result shows only part of the data', () => {
      const data = buildChartData(input(['a', 'b'], [['x', '1']], true), config({ x: 'a', y: ['b'] }));
      expect(noticeKinds(data)).toEqual(['truncated']);
      expect(data.notices[0].message).toContain('GROUP BY');
    });

    it('says how many rows have no usable value', () => {
      const rows = input(['a', 'b'], [['x', '1'], ['y', null], [null, '2'], ['z', 'n/a']]);
      const data = narrow(buildChartData(rows, config({ x: 'a', y: ['b'] })), 'cartesian');
      expect(data.notices[0]).toMatchObject({ kind: 'unusable', message: expect.stringContaining('3 row(s)') });
      expect(data.categories).toEqual(['x']);
    });

    it('adds repeated positions, and says so', () => {
      const rows = input(['a', 'b'], [['x', '1'], ['x', '2'], ['y', '3']]);
      const data = narrow(buildChartData(rows, config({ x: 'a', y: ['b'] })), 'cartesian');
      expect(data.series[0].values).toEqual([3, 3]);
      expect(data.notices[0]).toMatchObject({ kind: 'merged', message: expect.stringContaining('1 row(s)') });
    });

    it('counts one repeated row once, even with several measures', () => {
      const rows = input(['a', 'b', 'c'], [['x', '1', '1'], ['x', '2', '2']]);
      const data = buildChartData(rows, config({ x: 'a', y: ['b', 'c'] }));
      expect(data.notices[0].message).toContain('1 row(s)');
    });

    it('folds past 8 series into Other, keeping the largest and placing Other last', () => {
      const rows = Array.from({ length: 11 }, (_, index) => ['2026-11-01', `s${index}`, String(index + 1)]);
      const data = narrow(buildChartData(input(['d', 's', 'v'], rows), config({ kind: 'line', x: 'd', y: ['v'], group: 's' })), 'cartesian');
      expect(data.series).toHaveLength(8);
      expect(data.series.at(-1)).toEqual({ name: 'Other', values: [1 + 2 + 3 + 4] });
      expect(data.series.map((series) => series.name)).not.toContain('s0');
      expect(data.notices[0]).toMatchObject({ kind: 'folded', message: expect.stringContaining('4 group(s)') });
    });

    it('does not fold exactly 8 series', () => {
      const rows = Array.from({ length: 8 }, (_, index) => ['x', `s${index}`, '1']);
      const data = narrow(buildChartData(input(['x', 's', 'v'], rows), config({ x: 'x', y: ['v'], group: 's' })), 'cartesian');
      expect(data.series).toHaveLength(8);
      expect(data.notices).toEqual([]);
    });

    it('draws at most 8 measures, and says how many were left out', () => {
      const names = Array.from({ length: 10 }, (_, index) => `m${index}`);
      const data = narrow(buildChartData(input(['x', ...names], [['a', ...names.map(() => '1')]]), config({ x: 'x', y: names })), 'cartesian');
      expect(data.series).toHaveLength(8);
      expect(data.notices.at(-1)?.message).toContain('2 left out');
    });

    it('warns when an integer cannot be drawn exactly', () => {
      const data = buildChartData(input(['a', 'b'], [['x', '9007199254740993']]), config({ x: 'a', y: ['b'] }));
      expect(noticeKinds(data)).toEqual(['approximate']);
    });

    it('explains what is missing, instead of an empty chart', () => {
      const rows = input(['a', 'b'], [['x', 'y']]);
      expect(narrow(buildChartData(rows, config({ x: 'a', y: [] })), 'empty').reason).toContain('numeric');
      expect(narrow(buildChartData(rows, config({ y: ['b'] })), 'empty').reason).toContain('X axis');
      expect(narrow(buildChartData(rows, config({ x: 'a', y: ['gone'] })), 'empty').reason).toContain('numeric');
      expect(narrow(buildChartData(rows, config({ x: 'a', y: ['b'] })), 'empty').reason).toContain('No row');
      expect(narrow(buildChartData(input(['a'], []), config({ x: 'a' })), 'empty').reason).toContain('no rows');
    });
  });

  describe('pie', () => {
    it('ranks the slices', () => {
      const data = narrow(buildChartData(input(['a', 'b'], [['x', '1'], ['y', '3']]), config({ kind: 'pie', x: 'a', y: ['b'] })), 'pie');
      expect(data.slices).toEqual([{ name: 'y', value: 3 }, { name: 'x', value: 1 }]);
    });

    it('keeps 6 slices and folds the rest into Other, last', () => {
      const rows = Array.from({ length: 9 }, (_, index) => [`c${index}`, String(index + 1)]);
      const data = narrow(buildChartData(input(['a', 'b'], rows), config({ kind: 'pie', x: 'a', y: ['b'] })), 'pie');
      expect(data.slices).toHaveLength(7);
      expect(data.slices.at(-1)).toEqual({ name: 'Other', value: 1 + 2 + 3 });
      expect(noticeKinds(data)).toEqual(['folded']);
    });

    it('leaves zero and negative values out, and says so', () => {
      const data = buildChartData(input(['a', 'b'], [['x', '0'], ['y', '-1'], ['z', '2']]), config({ kind: 'pie', x: 'a', y: ['b'] }));
      expect(noticeKinds(data)).toEqual(['unusable']);
      expect(data.notices[0].message).toContain('2 row(s)');
    });

    it('has nothing to draw with only zeros', () => {
      expect(narrow(buildChartData(input(['a', 'b'], [['x', '0']]), config({ kind: 'pie', x: 'a', y: ['b'] })), 'empty').reason).toContain('greater than zero');
    });
  });

  describe('scatter', () => {
    const rows = input(['x', 'y', 's'], [['1', '2', 'a'], ['2', '4', 'a'], ['3', '6', 'b'], [null, '1', 'b']]);

    it('draws points by series', () => {
      const data = narrow(buildChartData(rows, config({ kind: 'scatter', x: 'x', y: ['y'], group: 's' })), 'scatter');
      expect(data.series).toEqual([{ name: 'a', points: [[1, 2], [2, 4]] }, { name: 'b', points: [[3, 6]] }]);
      expect(noticeKinds(data)).toEqual(['unusable']);
    });

    it('fits the trend line over all series, only when asked', () => {
      expect(narrow(buildChartData(rows, config({ kind: 'scatter', x: 'x', y: ['y'] })), 'scatter').regression).toBeUndefined();
      const data = narrow(buildChartData(rows, config({ kind: 'scatter', x: 'x', y: ['y'], group: 's', showRegression: true })), 'scatter');
      expect(data.regression).toMatchObject({ slope: 2, intercept: 0, rSquared: 1 });
    });

    it('says when the trend line cannot be drawn', () => {
      const data = buildChartData(input(['x', 'y'], [['1', '2'], ['1', '3']]), config({ kind: 'scatter', x: 'x', y: ['y'], showRegression: true }));
      expect(noticeKinds(data)).toEqual(['regression']);
    });

    it('keeps at most 3 series, because more cannot be told apart', () => {
      const many = Array.from({ length: 6 }, (_, index) => [String(index), '1', `s${index}`]);
      const data = narrow(buildChartData(input(['x', 'y', 's'], many), config({ kind: 'scatter', x: 'x', y: ['y'], group: 's' })), 'scatter');
      expect(data.series).toHaveLength(3);
      expect(data.series.at(-1)?.name).toBe('Other');
      expect(data.series.at(-1)?.points).toHaveLength(4);
    });
  });

  describe('histogram and box plot', () => {
    const rows = input(['v', 'g'], [['1', 'a'], ['2', 'a'], ['3', 'b'], [null, 'b']]);

    it('counts values into bins, honoring the requested number', () => {
      const data = narrow(buildChartData(rows, config({ kind: 'histogram', y: ['v'], binCount: 2 })), 'histogram');
      expect(data.bins.map((bin) => bin.count)).toEqual([1, 2]);
      expect(noticeKinds(data)).toEqual(['unusable']);
    });

    it('summarizes a whole column without a group', () => {
      const data = narrow(buildChartData(rows, config({ kind: 'boxplot', y: ['v'] })), 'boxplot');
      expect(data.groups).toHaveLength(1);
      expect(data.groups[0]).toMatchObject({ name: 'v', stats: { median: 2, count: 3 } });
    });

    it('summarizes each group', () => {
      const data = narrow(buildChartData(rows, config({ kind: 'boxplot', y: ['v'], group: 'g' })), 'boxplot');
      expect(data.groups.map((group) => [group.name, group.stats.count])).toEqual([['a', 2], ['b', 1]]);
    });

    it('recomputes Other from the values when there are too many groups', () => {
      const many = Array.from({ length: 35 }, (_, index) => [String(index), `g${index}`]);
      const data = narrow(buildChartData(input(['v', 'g'], many), config({ kind: 'boxplot', y: ['v'], group: 'g' })), 'boxplot');
      expect(data.groups).toHaveLength(30);
      expect(data.groups.at(-1)).toMatchObject({ name: 'Other', stats: { count: 6 } });
    });

    it('explains an unusable column', () => {
      const empty = input(['v'], [[null]]);
      expect(narrow(buildChartData(empty, config({ kind: 'histogram', y: ['v'] })), 'empty').reason).toContain('no numbers');
      expect(narrow(buildChartData(empty, config({ kind: 'boxplot', y: ['v'] })), 'empty').reason).toContain('no numbers');
    });
  });

  describe('heatmap', () => {
    const rows = input(['a', 'b', 'v'], [['x', 'p', '1'], ['y', 'q', '5'], ['x', 'p', '2'], ['y', 'p', null]]);

    it('builds cells over both axes, and leaves empty combinations out', () => {
      const data = narrow(buildChartData(rows, config({ kind: 'heatmap', x: 'a', y: ['v'], group: 'b' })), 'heatmap');
      expect(data.xCategories).toEqual(['x', 'y']);
      expect(data.yCategories).toEqual(['p', 'q']);
      expect(data.cells).toEqual([[0, 0, 3], [1, 1, 5]]);
      expect(data).toMatchObject({ min: 3, max: 5 });
      expect(noticeKinds(data)).toEqual(['unusable', 'merged']);
    });

    it('asks for the second column', () => {
      expect(narrow(buildChartData(rows, config({ kind: 'heatmap', x: 'a', y: ['v'] })), 'empty').reason).toContain('Y axis');
    });

    it('orders dates on its axes', () => {
      const dated = input(['d', 'b', 'v'], [['2026-11-02', 'p', '1'], ['2026-11-01', 'p', '2']]);
      const data = narrow(buildChartData(dated, config({ kind: 'heatmap', x: 'd', y: ['v'], group: 'b' })), 'heatmap');
      expect(data.xCategories).toEqual(['2026-11-01', '2026-11-02']);
    });
  });

  describe('single number', () => {
    it('shows the exact value, as text', () => {
      const data = narrow(buildChartData(input(['total'], [['9007199254740993']]), config({ kind: 'stat' })), 'stat');
      expect(data).toMatchObject({ label: 'total', value: '9007199254740993' });
    });

    it('shows NULL', () => {
      expect(narrow(buildChartData(input(['t'], [[null]]), config({ kind: 'stat' })), 'stat').value).toBe('NULL');
    });

    it('does not apply to anything else', () => {
      expect(narrow(buildChartData(input(['a', 'b'], [['1', '2']]), config({ kind: 'stat' })), 'empty').reason).toContain('one row and one column');
    });
  });
});
