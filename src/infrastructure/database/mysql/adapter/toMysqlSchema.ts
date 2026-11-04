import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { ForeignKey } from '../../../../domain/schema/model/ForeignKey';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { TableIndex } from '../../../../domain/schema/model/TableIndex';
import type { MysqlForeignKeyRow, MysqlIndexRow, MysqlSchemaRows } from '../model/mysqlSchemaRows';
import { normalizeMysqlDefault } from './normalizeMysqlDefault';
import { isBaseTable } from './isBaseTable';

const PRIMARY_INDEX_NAME = 'PRIMARY';

const AUTO_INCREMENT = 'auto_increment';

const AUTO_INCREMENT_CLAUSE = 'AUTO_INCREMENT';

const COMPUTED_COLUMN = /\b(VIRTUAL|STORED|PERSISTENT)\b/i;

export function toMysqlSchema(kind: DriverId, namespace: string, rows: MysqlSchemaRows): NamespaceSchema {
  const tables = rows.tables.map((table): TableDefinition => {
    const indexes = groupIndexes(rows.indexes.filter((index) => index.tableName === table.tableName));
    const primaryKey = indexes.find((index) => index.isPrimary)?.columns ?? [];

    return {
      namespace,
      name: table.tableName,
      kind: isBaseTable(table.tableType) ? 'table' : 'view',
      columns: rows.columns
        .filter((column) => column.tableName === table.tableName)
        .map((column) => ({
          name: column.columnName,
          dataType: column.dataType,
          nullable: column.isNullable === 'YES',
          isPrimaryKey: primaryKey.includes(column.columnName),
          defaultValue: normalizeMysqlDefault(column.columnDefault, column.extra),
          generationClause: column.extra.includes(AUTO_INCREMENT) ? AUTO_INCREMENT_CLAUSE : undefined,
          isComputed: COMPUTED_COLUMN.test(column.extra),
        })),
      primaryKey,
      foreignKeys: groupForeignKeys(rows.foreignKeys.filter((foreignKey) => foreignKey.tableName === table.tableName)),
      indexes,
      viewDefinition: table.viewDefinition ?? undefined,
    };
  });

  return { kind, namespace, tables };
}

function groupForeignKeys(rows: readonly MysqlForeignKeyRow[]): ForeignKey[] {
  const names = [...new Set(rows.map((row) => row.constraintName))];
  return names.map((name) => {
    const parts = rows.filter((row) => row.constraintName === name);
    return {
      name,
      columns: parts.map((part) => part.columnName),
      referencedNamespace: parts[0].referencedNamespace,
      referencedTable: parts[0].referencedTable,
      referencedColumns: parts.map((part) => part.referencedColumn),
      onDelete: parts[0].deleteRule,
      onUpdate: parts[0].updateRule,
    };
  });
}

function groupIndexes(rows: readonly MysqlIndexRow[]): TableIndex[] {
  const names = [...new Set(rows.map((row) => row.indexName))];
  return names.flatMap((name) => {
    const parts = rows.filter((row) => row.indexName === name);
    if (parts.some((part) => part.columnName === null)) {
      return [];
    }
    return [{
      name,
      columns: parts.map((part) => String(part.columnName)),
      isUnique: Number(parts[0].nonUnique) === 0,
      isPrimary: name === PRIMARY_INDEX_NAME,
    }];
  });
}
