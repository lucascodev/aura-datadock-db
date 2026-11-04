import * as vscode from 'vscode';
import type { SchemaExportFormatId } from '../../../../application/schema/model/SchemaExportFormat';
import { SCHEMA_EXPORT_FORMATS } from '../../../../application/schema/constants/schemaExportFormats';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function saveSchemaExport(schema: NamespaceSchema, formatId: SchemaExportFormatId): Promise<void> {
  const format = SCHEMA_EXPORT_FORMATS.find((candidate) => candidate.id === formatId);
  if (!format) {
    return;
  }
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${schema.namespace}.${format.extension}`),
    filters: { [format.label()]: [format.extension] },
  });
  if (uri) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(format.render(schema), 'utf8'));
    vscode.window.setStatusBarMessage(l10n.t('Saved schema to {0}', uri.fsPath), 3000);
  }
}
