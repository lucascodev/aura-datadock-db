import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';

export type SchemaExportFormatId = 'ddl' | 'mermaid' | 'dbml' | 'json';

export interface SchemaExportFormat {
  readonly id: SchemaExportFormatId;
  readonly label: () => string;
  readonly extension: string;
  readonly languageId: string;
  render(schema: NamespaceSchema): string;
}
