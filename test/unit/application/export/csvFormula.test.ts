import { describe, expect, it } from 'vitest';
import { createCsvEncoder } from '../../../../src/application/export/encoders/formats/createCsvEncoder';
import { encodeRows } from '../../../../src/application/export/encoders/writing/encodeRows';

function encodeCell(value: unknown): string {
  return encodeRows(createCsvEncoder(), { columns: ['a'], rows: [[value]] }).split('\r\n').slice(1).join('\r\n').replace(/\r\n$/, '');
}

describe('formulas in CSV', () => {
  it.each(['=1+1', '+SUM(A1)', '-2+3', '@SUM(A1)', '\tcell', '\rcell'])('neutralizes a cell that a spreadsheet would run: %j', (text) => {
    expect(encodeCell(text).replace(/^"/, '')).toMatch(/^'/);
  });

  it('keeps quoting a neutralized cell', () => {
    expect(encodeCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
  });

  it('neutralizes a column name too', () => {
    expect(encodeRows(createCsvEncoder(), { columns: ['=cmd'], rows: [] })).toBe(`'=cmd\r\n`);
  });

  it.each(['-5', '+5', '-1.5', '1e5', '-1.5E-3', 'text', 'a=b', '', '5-3'])('keeps ordinary values untouched: %j', (text) => {
    expect(encodeCell(text)).toBe(text);
  });

  it('keeps negative numbers from the database untouched', () => {
    expect(encodeCell(-7)).toBe('-7');
  });
});
