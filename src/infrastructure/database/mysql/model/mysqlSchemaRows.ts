export interface MysqlTableRow {
  readonly tableName: string;
  readonly tableType: string;
  readonly viewDefinition: string | null;
}

export interface MysqlColumnRow {
  readonly tableName: string;
  readonly columnName: string;
  readonly dataType: string;
  readonly isNullable: string;
  readonly columnDefault: string | null;
  readonly extra: string;
}

export interface MysqlForeignKeyRow {
  readonly tableName: string;
  readonly constraintName: string;
  readonly columnName: string;
  readonly referencedNamespace: string;
  readonly referencedTable: string;
  readonly referencedColumn: string;
  readonly deleteRule: string;
  readonly updateRule: string;
}

export interface MysqlIndexRow {
  readonly tableName: string;
  readonly indexName: string;
  readonly nonUnique: number | string;
  readonly columnName: string | null;
}

export interface MysqlSchemaRows {
  readonly tables: readonly MysqlTableRow[];
  readonly columns: readonly MysqlColumnRow[];
  readonly foreignKeys: readonly MysqlForeignKeyRow[];
  readonly indexes: readonly MysqlIndexRow[];
}
