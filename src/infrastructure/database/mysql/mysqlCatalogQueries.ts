export const LIST_TABLES_SQL = `
  SELECT t.TABLE_NAME AS tableName,
         t.TABLE_TYPE AS tableType,
         v.VIEW_DEFINITION AS viewDefinition
    FROM information_schema.TABLES t
    LEFT JOIN information_schema.VIEWS v
      ON v.TABLE_SCHEMA = t.TABLE_SCHEMA AND v.TABLE_NAME = t.TABLE_NAME
   WHERE t.TABLE_SCHEMA = ?
   ORDER BY t.TABLE_NAME`;

export const LIST_COLUMNS_SQL = `
  SELECT TABLE_NAME AS tableName,
         COLUMN_NAME AS columnName,
         COLUMN_TYPE AS dataType,
         IS_NULLABLE AS isNullable,
         COLUMN_DEFAULT AS columnDefault,
         EXTRA AS extra
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ?
   ORDER BY TABLE_NAME, ORDINAL_POSITION`;

export const LIST_FOREIGN_KEYS_SQL = `
  SELECT k.TABLE_NAME AS tableName,
         k.CONSTRAINT_NAME AS constraintName,
         k.COLUMN_NAME AS columnName,
         k.REFERENCED_TABLE_SCHEMA AS referencedNamespace,
         k.REFERENCED_TABLE_NAME AS referencedTable,
         k.REFERENCED_COLUMN_NAME AS referencedColumn,
         r.DELETE_RULE AS deleteRule,
         r.UPDATE_RULE AS updateRule
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     AND r.TABLE_NAME = k.TABLE_NAME
   WHERE k.TABLE_SCHEMA = ?
     AND k.REFERENCED_TABLE_NAME IS NOT NULL
   ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`;

export const LIST_INDEXES_SQL = `
  SELECT TABLE_NAME AS tableName,
         INDEX_NAME AS indexName,
         NON_UNIQUE AS nonUnique,
         COLUMN_NAME AS columnName
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = ?
   ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`;
