import { createCsvEncoder } from '../encoders/formats/createCsvEncoder';
import { createJsonEncoder } from '../encoders/formats/createJsonEncoder';
import { createNdjsonEncoder } from '../encoders/formats/createNdjsonEncoder';
import { createMarkdownEncoder } from '../encoders/formats/createMarkdownEncoder';
import { createSqlInsertEncoder } from '../encoders/formats/createSqlInsertEncoder';
import type { RowExportFormat } from '../model/RowExportFormat';
import { l10n } from '../../../domain/i18n/translation/l10n';

export const ROW_EXPORT_FORMATS: readonly RowExportFormat[] = [
  { id: 'csv', label: () => 'CSV', extension: 'csv', createEncoder: createCsvEncoder },
  { id: 'json', label: () => 'JSON', extension: 'json', createEncoder: createJsonEncoder },
  { id: 'ndjson', label: () => 'NDJSON', extension: 'ndjson', createEncoder: createNdjsonEncoder },
  { id: 'markdown', label: () => l10n.t('Markdown table'), extension: 'md', createEncoder: createMarkdownEncoder },
  { id: 'sql', label: () => 'SQL INSERT', extension: 'sql', createEncoder: createSqlInsertEncoder },
];
