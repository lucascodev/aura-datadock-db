import type { RowEncoder } from './RowEncoder';
import { toExportText } from './toExportValue';

const LINE_BREAK = '\r\n';
const NEEDS_QUOTING = /[",\r\n]/;

export function createCsvEncoder(): RowEncoder {
  return {
    begin: (columns) => `${columns.map(encodeCell).join(',')}${LINE_BREAK}`,
    encode: (row) => `${row.map((value) => encodeCell(toExportText(value))).join(',')}${LINE_BREAK}`,
    end: () => '',
  };
}

function encodeCell(text: string): string {
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
