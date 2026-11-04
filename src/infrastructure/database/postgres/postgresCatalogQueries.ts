const RELATION_KINDS = `('r', 'p', 'v', 'm', 'f')`;

export const LIST_NAMESPACES_SQL = `
  SELECT nspname AS schema_name
    FROM pg_catalog.pg_namespace
   WHERE nspname NOT IN ('pg_catalog', 'information_schema')
     AND nspname NOT LIKE 'pg_toast%'
     AND nspname NOT LIKE 'pg_temp%'
   ORDER BY nspname`;

export const LIST_TABLES_SQL = `
  SELECT c.relname AS table_name,
         c.relkind AS relation_kind,
         CASE WHEN c.relkind IN ('v', 'm') THEN pg_catalog.pg_get_viewdef(c.oid, true) END AS view_definition
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = $1
     AND c.relkind IN ${RELATION_KINDS}
     AND NOT c.relispartition
   ORDER BY c.relname`;

export const LIST_COLUMNS_SQL = `
  SELECT c.relname AS table_name,
         a.attname AS column_name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
         a.attnotnull AS is_not_null,
         pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS column_default,
         a.attidentity AS identity_kind,
         COALESCE(to_jsonb(a) ->> 'attgenerated', '') <> '' AS is_computed
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE n.nspname = $1
     AND c.relkind IN ${RELATION_KINDS}
     AND NOT c.relispartition
     AND a.attnum > 0
     AND NOT a.attisdropped
   ORDER BY c.relname, a.attnum`;

export const LIST_CONSTRAINTS_SQL = `
  SELECT con.conname AS constraint_name,
         con.contype AS constraint_type,
         c.relname AS table_name,
         ARRAY(
           SELECT a.attname::text
             FROM unnest(con.conkey) WITH ORDINALITY AS key(attnum, position)
             JOIN pg_catalog.pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = key.attnum
            ORDER BY key.position
         ) AS column_names,
         referenced_namespace.nspname AS referenced_namespace,
         referenced_table.relname AS referenced_table,
         ARRAY(
           SELECT a.attname::text
             FROM unnest(con.confkey) WITH ORDINALITY AS key(attnum, position)
             JOIN pg_catalog.pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = key.attnum
            ORDER BY key.position
         ) AS referenced_columns,
         con.confdeltype AS delete_action,
         con.confupdtype AS update_action
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_catalog.pg_class referenced_table ON referenced_table.oid = con.confrelid
    LEFT JOIN pg_catalog.pg_namespace referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
   WHERE n.nspname = $1
     AND con.contype IN ('p', 'f')
   ORDER BY c.relname, con.conname`;

export const LIST_INDEXES_SQL = `
  SELECT c.relname AS table_name,
         i.relname AS index_name,
         ix.indisunique AND ix.indpred IS NULL AS is_unique,
         ix.indisprimary AS is_primary,
         pg_catalog.pg_get_indexdef(ix.indexrelid) AS definition,
         ARRAY(
           SELECT pg_catalog.pg_get_indexdef(ix.indexrelid, position, true)
             FROM generate_series(1, COALESCE((to_jsonb(ix) ->> 'indnkeyatts')::int, ix.indnatts)) AS position
            ORDER BY position
         ) AS column_names
    FROM pg_catalog.pg_index ix
    JOIN pg_catalog.pg_class c ON c.oid = ix.indrelid
    JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = $1
   ORDER BY c.relname, i.relname`;

export const BACKEND_PID_SQL = 'SELECT pg_catalog.pg_backend_pid() AS pid';
export const CANCEL_BACKEND_SQL = 'SELECT pg_catalog.pg_cancel_backend($1)';
