import { renderDbml } from './renderDbml';
import { renderDdl } from './renderDdl';
import { renderMermaidEr } from './renderMermaidEr';
import type { SchemaExportFormat } from './SchemaExportFormat';
import { l10n } from '../../../domain/i18n/translation/l10n';

export const SCHEMA_EXPORT_FORMATS: readonly SchemaExportFormat[] = [
  { id: 'ddl', label: () => 'SQL DDL', extension: 'sql', languageId: 'sql', render: (schema) => renderDdl(schema) },
  { id: 'mermaid', label: () => l10n.t('Mermaid ER diagram'), extension: 'mmd', languageId: 'plaintext', render: renderMermaidEr },
  { id: 'dbml', label: () => 'DBML', extension: 'dbml', languageId: 'plaintext', render: renderDbml },
  { id: 'json', label: () => 'JSON', extension: 'json', languageId: 'json', render: (schema) => `${JSON.stringify(schema, null, 2)}\n` },
];
