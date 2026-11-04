import { uniqueColumnNames } from '../../../format/text/uniqueColumnNames';
import type { RowEncoder } from '../../model/RowEncoder';
import { toJsonRow } from './toJsonRow';

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
