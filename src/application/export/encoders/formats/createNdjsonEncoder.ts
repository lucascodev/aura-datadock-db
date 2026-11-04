import { uniqueColumnNames } from '../../../format/text/uniqueColumnNames';
import type { RowEncoder } from '../../model/RowEncoder';
import { toJsonRow } from './toJsonRow';

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
