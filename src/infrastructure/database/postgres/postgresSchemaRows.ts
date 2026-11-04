export interface PostgresTableRow {
  readonly table_name: string;
  readonly relation_kind: string;
  readonly view_definition: string | null;
}

export interface PostgresColumnRow {
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_not_null: boolean;
  readonly column_default: string | null;
  readonly identity_kind: string;
  readonly is_computed: boolean;
}

export interface PostgresConstraintRow {
  readonly constraint_name: string;
  readonly constraint_type: 'p' | 'f';
  readonly table_name: string;
  readonly column_names: string[];
  readonly referenced_namespace: string | null;
  readonly referenced_table: string | null;
  readonly referenced_columns: string[];
  readonly delete_action: string;
  readonly update_action: string;
}

export interface PostgresIndexRow {
  readonly table_name: string;
  readonly index_name: string;
  readonly is_unique: boolean;
  readonly is_primary: boolean;
  readonly definition: string;
  readonly column_names: string[];
}

export interface PostgresSchemaRows {
  readonly tables: readonly PostgresTableRow[];
  readonly columns: readonly PostgresColumnRow[];
  readonly constraints: readonly PostgresConstraintRow[];
  readonly indexes: readonly PostgresIndexRow[];
}
