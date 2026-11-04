import { describe, expect, it } from 'vitest';
import { canGoNext } from '../../../../src/application/editing/paging/canGoNext';
import { canGoPrevious } from '../../../../src/application/editing/paging/canGoPrevious';
import { clampLimit } from '../../../../src/application/editing/paging/clampLimit';
import { lastOffset } from '../../../../src/application/editing/paging/lastOffset';
import { nextSort } from '../../../../src/application/editing/paging/nextSort';

describe('canGoNext', () => {
  it('guesses from a full page while the total is unknown', () => {
    expect(canGoNext(false, false, undefined, 0, 10, 10)).toBe(true);
    expect(canGoNext(false, false, undefined, 0, 4, 10)).toBe(false);
  });

  it('uses the total when known', () => {
    expect(canGoNext(false, false, 25, 10, 10, 10)).toBe(true);
    expect(canGoNext(false, false, 20, 10, 10, 10)).toBe(false);
  });

  it('is off while busy or showing a custom result', () => {
    expect(canGoNext(false, true, 25, 0, 10, 10)).toBe(false);
    expect(canGoNext(true, false, 25, 0, 10, 10)).toBe(false);
  });
});

describe('canGoPrevious', () => {
  it('needs an offset and an idle table', () => {
    expect(canGoPrevious(false, false, 10)).toBe(true);
    expect(canGoPrevious(false, false, 0)).toBe(false);
    expect(canGoPrevious(false, true, 10)).toBe(false);
    expect(canGoPrevious(true, false, 10)).toBe(false);
  });
});

describe('lastOffset', () => {
  it('points to the start of the last page', () => {
    expect(lastOffset(30, 10)).toBe(20);
    expect(lastOffset(31, 10)).toBe(30);
  });

  it('is zero without rows or total', () => {
    expect(lastOffset(0, 10)).toBe(0);
    expect(lastOffset(undefined, 10)).toBe(0);
  });
});

describe('clampLimit', () => {
  it('keeps the limit within bounds', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(99999)).toBe(5000);
    expect(clampLimit(250)).toBe(250);
  });

  it('refuses what is not an integer', () => {
    expect(clampLimit(Number.NaN)).toBeUndefined();
    expect(clampLimit(1.5)).toBeUndefined();
  });
});

describe('nextSort', () => {
  it('goes ascending, descending, then off', () => {
    const ascending = nextSort(undefined, 'a');
    expect(ascending).toEqual({ column: 'a', isDescending: false });
    const descending = nextSort(ascending, 'a');
    expect(descending).toEqual({ column: 'a', isDescending: true });
    expect(nextSort(descending, 'a')).toBeUndefined();
  });

  it('starts over on another column', () => {
    expect(nextSort({ column: 'a', isDescending: true }, 'b')).toEqual({ column: 'b', isDescending: false });
  });
});
