import { describe, expect, it } from 'vitest';
import { computeBoxplot } from '../../../../src/application/charts/statistics/computeBoxplot';
import { computeHistogram } from '../../../../src/application/charts/statistics/computeHistogram';
import { computeLinearRegression } from '../../../../src/application/charts/statistics/computeLinearRegression';
import { quantile } from '../../../../src/application/charts/statistics/quantile';

describe('quantile', () => {
  it('interpolates between neighbors', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([7], 0.75)).toBe(7);
  });
});

describe('computeHistogram', () => {
  it('counts every value exactly once, including the maximum', () => {
    const values = [1, 2, 2, 3, 3, 3, 4, 4, 5, 10];
    const bins = computeHistogram(values, 3);
    expect(bins).toEqual([
      { from: 1, to: 4, count: 6 },
      { from: 4, to: 7, count: 3 },
      { from: 7, to: 10, count: 1 },
    ]);
  });

  it('chooses the number of bins by itself, never losing a value', () => {
    const values = Array.from({ length: 1000 }, (_, index) => index % 97);
    const bins = computeHistogram(values);
    expect(bins.length).toBeGreaterThan(1);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(1000);
  });

  it('falls back when most values are the same', () => {
    const bins = computeHistogram([5, 5, 5, 5, 5, 5, 5, 5, 9]);
    expect(bins.length).toBeGreaterThan(1);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(9);
  });

  it('keeps every bin contiguous', () => {
    const bins = computeHistogram([0.1, 0.2, 0.35, 0.9, 1.7, 2.2], 4);
    bins.slice(1).forEach((bin, index) => expect(bin.from).toBe(bins[index].to));
  });

  it.each([
    ['one value', [7], [{ from: 7, to: 7, count: 1 }]],
    ['all the same', [7, 7, 7], [{ from: 7, to: 7, count: 3 }]],
    ['nothing', [], []],
  ])('handles %s', (_name, values, expected) => {
    expect(computeHistogram(values)).toEqual(expected);
  });

  it('keeps a requested number of bins within reason', () => {
    expect(computeHistogram([1, 2], 0.2)).toHaveLength(1);
    expect(computeHistogram([1, 2], 100_000)).toHaveLength(200);
  });
});

describe('computeBoxplot', () => {
  it('matches known quartiles', () => {
    expect(computeBoxplot([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({ lowerWhisker: 1, q1: 3, median: 5, q3: 7, upperWhisker: 9, outliers: [], count: 9 });
  });

  it('separates outliers and stops the whiskers at the last value inside', () => {
    const stats = computeBoxplot([1, 2, 3, 4, 5, 6, 7, 8, 9, 100, -50]);
    expect(stats?.outliers).toEqual([-50, 100]);
    expect(stats?.lowerWhisker).toBe(1);
    expect(stats?.upperWhisker).toBe(9);
  });

  it.each([
    ['one value', [4], { lowerWhisker: 4, q1: 4, median: 4, q3: 4, upperWhisker: 4, outliers: [], count: 1 }],
    ['all the same', [4, 4, 4], { lowerWhisker: 4, q1: 4, median: 4, q3: 4, upperWhisker: 4, outliers: [], count: 3 }],
  ])('handles %s', (_name, values, expected) => {
    expect(computeBoxplot(values)).toEqual(expected);
  });

  it('has nothing to summarize without values', () => {
    expect(computeBoxplot([])).toBeUndefined();
  });

  it('does not change the values it receives', () => {
    const values = [3, 1, 2];
    computeBoxplot(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('computeLinearRegression', () => {
  it('finds an exact line', () => {
    const regression = computeLinearRegression([[0, 1], [1, 3], [2, 5]]);
    expect(regression).toEqual({ slope: 2, intercept: 1, rSquared: 1, from: [0, 1], to: [2, 5] });
  });

  it('matches a known fit', () => {
    const regression = computeLinearRegression([[1, 1], [2, 3], [3, 2], [4, 5], [5, 4]]);
    expect(regression?.slope).toBeCloseTo(0.8);
    expect(regression?.intercept).toBeCloseTo(0.6);
    expect(regression?.rSquared).toBeCloseTo(0.64);
  });

  it('treats a flat line as a perfect fit', () => {
    expect(computeLinearRegression([[1, 5], [2, 5]])).toMatchObject({ slope: 0, intercept: 5, rSquared: 1 });
  });

  it.each([
    ['one point', [[1, 1]]],
    ['the same X', [[1, 1], [1, 2]]],
    ['nothing', []],
  ] as [string, [number, number][]][])('has no line for %s', (_name, points) => {
    expect(computeLinearRegression(points)).toBeUndefined();
  });
});
