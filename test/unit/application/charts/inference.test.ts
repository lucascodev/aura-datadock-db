import { describe, expect, it } from 'vitest';
import { adaptConfig } from '../../../../src/application/charts/inference/adaptConfig';
import { describeColumns, inferColumnKind } from '../../../../src/application/charts/inference/inferColumnKind';
import { losesPrecision, parseChartNumber } from '../../../../src/application/charts/inference/parseChartNumber';
import { parseChartTemporal } from '../../../../src/application/charts/inference/parseChartTemporal';
import { suggestChart } from '../../../../src/application/charts/inference/suggestChart';
import type { ChartConfig } from '../../../../src/application/charts/model/config/ChartConfig';
import { CHART_KINDS } from '../../../../src/application/charts/constants/chartKinds';
import type { ColumnInfo } from '../../../../src/application/charts/model/config/ColumnKind';

const number = (name: string): ColumnInfo => ({ name, kind: 'number' });
const temporal = (name: string): ColumnInfo => ({ name, kind: 'temporal' });
const category = (name: string): ColumnInfo => ({ name, kind: 'category' });

describe('parseChartNumber', () => {
  it.each([['12', 12], ['-3.5', -3.5], ['1e3', 1000], ['.5', 0.5], [' 7 ', 7], ['150.00', 150]])('reads %s', (text, expected) => {
    expect(parseChartNumber(text)).toBe(expected);
  });

  it.each(['', 'abc', '12abc', '0x10', 'Infinity', 'NaN', '1,5', '2026-11-03'])('refuses %j', (text) => {
    expect(parseChartNumber(text)).toBeUndefined();
  });

  it('refuses NULL', () => {
    expect(parseChartNumber(null)).toBeUndefined();
  });

  it('knows when a big integer cannot be drawn exactly', () => {
    expect(losesPrecision('9007199254740993')).toBe(true);
    expect(losesPrecision('9007199254740991')).toBe(false);
    expect(losesPrecision('12.5')).toBe(false);
    expect(losesPrecision(null)).toBe(false);
  });
});

describe('parseChartTemporal', () => {
  it.each([
    ['2026-11-03', Date.UTC(2026, 10, 3)],
    ['2026-11-03 10:30:00', Date.UTC(2026, 10, 3, 10, 30)],
    ['2026-11-03T10:30:15.250Z', Date.UTC(2026, 10, 3, 10, 30, 15, 250)],
    ['2026-11-03 10:30:00+00', Date.UTC(2026, 10, 3, 10, 30)],
    ['2026-11-03 10:30:00.123456-03', Date.UTC(2026, 10, 3, 10, 30, 0, 123)],
  ])('reads %s as written, without moving it to another time zone', (text, expected) => {
    expect(parseChartTemporal(text)).toBe(expected);
  });

  it.each(['2026-13-01', '2026-02-30', 'Nov 3 2026', '2026', '11/03/2026', '12', 'yesterday', '2026-11-03 25:00:00'])('refuses %s', (text) => {
    expect(parseChartTemporal(text)).toBeUndefined();
  });
});

describe('inferColumnKind', () => {
  it('ignores NULL when deciding', () => {
    expect(inferColumnKind(['1', null, '2.5'])).toBe('number');
    expect(inferColumnKind([null, '2026-11-03'])).toBe('temporal');
  });

  it('needs every value to agree', () => {
    expect(inferColumnKind(['1', 'two'])).toBe('category');
    expect(inferColumnKind(['2026-11-03', 'soon'])).toBe('category');
  });

  it('treats a column with no values as a category', () => {
    expect(inferColumnKind([null, null])).toBe('category');
    expect(inferColumnKind([])).toBe('category');
  });

  it('describes the columns of a result', () => {
    const input = { columns: ['day', 'status', 'total'], rows: [['2026-11-03', 'paid', '5']], isTruncated: false };
    expect(describeColumns(input)).toEqual([temporal('day'), category('status'), number('total')]);
  });
});

describe('suggestChart', () => {
  it.each<[string, ColumnInfo[], number, Partial<ChartConfig> | undefined]>([
    ['one value: a number instead of a chart', [number('total')], 1, { kind: 'stat' }],
    ['date and number: a line', [temporal('day'), number('total')], 10, { kind: 'line', x: 'day', y: ['total'] }],
    ['date and several numbers: several lines', [temporal('day'), number('a'), number('b')], 10, { kind: 'line', y: ['a', 'b'] }],
    ['date, category and number: one line per category', [temporal('day'), category('status'), number('total')], 10, { kind: 'line', x: 'day', y: ['total'], group: 'status' }],
    ['category and number: bars', [category('status'), number('total')], 3, { kind: 'bar', x: 'status', y: ['total'] }],
    ['two categories and a number: a heatmap', [category('a'), category('b'), number('total')], 9, { kind: 'heatmap', x: 'a', group: 'b', y: ['total'] }],
    ['two numbers: a scatter plot', [number('a'), number('b')], 20, { kind: 'scatter', x: 'a', y: ['b'] }],
    ['one number: a histogram', [number('a')], 20, { kind: 'histogram', y: ['a'] }],
    ['no number: nothing', [category('a'), temporal('b')], 20, undefined],
    ['no rows: nothing', [number('a')], 0, undefined],
    ['one row with several values: nothing to compare', [category('a'), number('b')], 1, undefined],
  ])('%s', (_name, columns, rowCount, expected) => {
    const suggestion = suggestChart(columns, rowCount);
    if (expected) {
      expect(suggestion).toMatchObject(expected);
    } else {
      expect(suggestion).toBeUndefined();
    }
  });

  it('never suggests a pie', () => {
    const combinations = [[category('a'), number('b')], [number('a')], [temporal('a'), number('b')]];
    combinations.forEach((columns) => expect(suggestChart(columns, 4)?.kind).not.toBe('pie'));
  });
});

describe('adaptConfig', () => {
  const columns = [temporal('day'), category('status'), number('total'), number('cost')];
  const previous: ChartConfig = { kind: 'line', x: 'day', y: ['total', 'cost'], showRegression: true };

  it('keeps the choices that still make sense', () => {
    expect(adaptConfig('bar', previous, columns)).toMatchObject({ kind: 'bar', x: 'day', y: ['total', 'cost'], showRegression: true });
  });

  it('uses numbers on both axes of a scatter plot, without repeating one', () => {
    expect(adaptConfig('scatter', previous, columns)).toMatchObject({ x: 'total', y: ['cost'] });
  });

  it('drops the X axis when there is none', () => {
    expect(adaptConfig('histogram', previous, columns)).toMatchObject({ x: undefined, y: ['total'] });
  });

  it('chooses a second column for a heatmap', () => {
    expect(adaptConfig('heatmap', previous, columns)).toMatchObject({ x: 'day', group: 'status', y: ['total'] });
  });

  it('draws a single measure when there is a series column', () => {
    expect(adaptConfig('line', { ...previous, group: 'status' }, columns)).toMatchObject({ group: 'status', y: ['total'] });
  });

  it('produces something valid from any kind to any other', () => {
    for (const from of CHART_KINDS) {
      for (const to of CHART_KINDS) {
        const adapted = adaptConfig(to.id, adaptConfig(from.id, previous, columns), columns);
        expect(adapted.kind).toBe(to.id);
        if (to.y !== 'none') {
          expect(adapted.y.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('does not fail without numeric columns', () => {
    expect(adaptConfig('bar', { kind: 'bar', y: [], showRegression: false }, [category('a')])).toMatchObject({ x: 'a', y: [] });
  });
});
