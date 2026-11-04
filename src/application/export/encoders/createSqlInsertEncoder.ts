import { quoteIdentifier, quoteTable } from '../../../drivers/catalog/quoteIdentifier';
import { toSqlLiteral } from '../../sql/toSqlLiteral';
import type { RowEncoder } from './RowEncoder';
import type { RowExportContext } from '../formats/RowExportFormat';

const FALLBACK_TABLE_NAME = 'query_result';

export function createSqlInsertEncoder({ kind, table }: RowExportContext): RowEncoder {
  const tableName = table ? quoteTable(kind, table) : quoteIdentifier(kind, FALLBACK_TABLE_NAME);
  let columnList = '';

  return {
    begin(columns) {
      columnList = columns.map((column) => quoteIdentifier(kind, column)).join(', ');
      return '';
    },
    encode: (row) => `INSERT INTO ${tableName} (${columnList}) VALUES (${row.map((value) => toSqlLiteral(kind, value)).join(', ')});\n`,
    end: () => '',
  };
}
