import { uniqueColumnNames } from '../../format/uniqueColumnNames';
import type { RowEncoder } from '../model/RowEncoder';
import { toExportValue } from './toExportValue';

export function toJsonRow(columnNames: readonly string[], row: readonly unknown[]): Record<string, unknown> {
  return Object.fromEntries(columnNames.map((name, index) => [name, toExportValue(row[index]) ?? null]));
}

export function createJsonEncoder(): RowEncoder {
  let columnNames: readonly string[] = [];
  let isFirstRow = true;

  return {
    begin(columns) {
      columnNames = uniqueColumnNames(columns);
      return '[';
    },
    encode(row) {
      const separator = isFirstRow ? '\n' : ',\n';
      isFirstRow = false;
      return `${separator}  ${JSON.stringify(toJsonRow(columnNames, row))}`;
    },
    end: () => (isFirstRow ? ']\n' : '\n]\n'),
  };
}

export function createNdjsonEncoder(): RowEncoder {
  let columnNames: readonly string[] = [];

  return {
    begin(columns) {
      columnNames = uniqueColumnNames(columns);
      return '';
    },
    encode: (row) => `${JSON.stringify(toJsonRow(columnNames, row))}\n`,
    end: () => '',
  };
}
