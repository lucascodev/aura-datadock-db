import type { RowEncoder } from './RowEncoder';
import { toExportText } from './toExportValue';

const LINE_BREAK = '\r\n';
const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const FORMULA_GUARD = "'";

export function createCsvEncoder(): RowEncoder {
  return {
    begin: (columns) => `${columns.map(encodeCell).join(',')}${LINE_BREAK}`,
    encode: (row) => `${row.map((value) => encodeCell(toExportText(value))).join(',')}${LINE_BREAK}`,
    end: () => '',
  };
}

function encodeCell(text: string): string {
  const safeText = neutralizeFormula(text);
  return NEEDS_QUOTING.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

function neutralizeFormula(text: string): string {
  return FORMULA_START.test(text) && !PLAIN_NUMBER.test(text) ? `${FORMULA_GUARD}${text}` : text;
}
