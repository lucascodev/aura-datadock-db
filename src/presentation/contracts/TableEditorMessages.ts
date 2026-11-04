import type { TableEditability } from '../../application/editing/model/TableEditability';
import type { RowChange } from '../../application/editing/model/RowChange';
import type { TablePageRequest, TableRowSelection } from '../../application/editing/model/tableFilters';
import type { IncomingReference } from '../../application/schema/model/IncomingReference';
import type { NamespaceSchema } from '../../domain/schema/model/NamespaceSchema';
import type { CellValue } from '../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../domain/schema/model/TableDefinition';

export interface TableColumnView {
  readonly name: string;
  readonly dataType: string;
  readonly isNullable: boolean;
  readonly isPrimaryKey: boolean;
  readonly isForeignKey: boolean;
  readonly hasDefault: boolean;
  readonly isEditable: boolean;
}

export interface TablePropertiesView {
  readonly table: TableDefinition;
  readonly incomingReferences: readonly IncomingReference[];
  readonly ddl: string;
  readonly diagramSchema: NamespaceSchema;
}

export interface CustomResultView {
  readonly sql: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly CellValue[])[];
  readonly isTruncated: boolean;
  readonly durationMs: number;
}

export type TableEditorHostMessage =
  | {
      readonly type: 'init';
      readonly title: string;
      readonly tableName: string;
      readonly columns: readonly TableColumnView[];
      readonly primaryKey: readonly string[];
      readonly editability: TableEditability;
      readonly pageSize: number;
      readonly changes: readonly RowChange[];
      readonly shouldAddRow: boolean;
      readonly properties: TablePropertiesView;
    }
  | { readonly type: 'page'; readonly request: TablePageRequest; readonly sql: string; readonly rows: readonly (readonly CellValue[])[]; readonly durationMs: number }
  | { readonly type: 'count'; readonly total: number }
  | { readonly type: 'saved'; readonly affectedRows: number }
  | { readonly type: 'customResult'; readonly result: CustomResultView }
  | { readonly type: 'scriptFinished' }
  | { readonly type: 'failed'; readonly message: string };

export type TableEditorWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'loadPage'; readonly request: TablePageRequest }
  | { readonly type: 'pendingChanged'; readonly changes: readonly RowChange[] }
  | { readonly type: 'save'; readonly changes: readonly RowChange[] }
  | { readonly type: 'preview'; readonly changes: readonly RowChange[] }
  | { readonly type: 'runSql'; readonly sql: string; readonly limit: number }
  | { readonly type: 'chartSql'; readonly sql: string }
  | { readonly type: 'openSql'; readonly sql: string }
  | { readonly type: 'copyText'; readonly text: string }
  | { readonly type: 'exportData'; readonly selection: TableRowSelection }
  | { readonly type: 'openTable'; readonly table: string };
