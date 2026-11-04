import type { SchemaExportFormatId } from '../../../../application/schema/rendering/SchemaExportFormat';
import type { ConnectionTarget } from '../../../../domain/connection/ConnectionTarget';
import type { NamespaceSchema } from '../../../../domain/schema/NamespaceSchema';
import type { TableRef } from '../../../../domain/schema/TableRef';
import * as vscode from 'vscode';

export interface DiagramPanelDependencies {
  readonly extensionUri: vscode.Uri;
  readonly storage: vscode.Memento;
  listNamespaces(targetId: string): Promise<string[]>;
  loadSchema(targetId: string, namespace: string): Promise<NamespaceSchema>;
  invalidateSchema(targetId: string): void;
  openTable(target: ConnectionTarget, table: TableRef): Promise<void>;
  saveSchemaExport(schema: NamespaceSchema, format: SchemaExportFormatId): Promise<void>;
}
