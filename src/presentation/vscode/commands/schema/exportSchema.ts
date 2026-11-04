import * as vscode from 'vscode';
import { chooseDefaultNamespace } from '../../../../application/schema/loading/chooseDefaultNamespace';
import { SCHEMA_EXPORT_FORMATS } from '../../../../application/schema/constants/schemaExportFormats';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { SchemaCommandArgument } from '../model/SchemaCommandArgument';
import { saveSchemaExport } from './saveSchemaExport';
import { resolveLocation } from './resolveLocation';
import { showError } from './showError';

export async function exportSchema(context: DataDockContext, argument: SchemaCommandArgument): Promise<void> {
  const location = await resolveLocation(context, argument);
  if (!location) {
    return;
  }
  try {
    const namespace = location.namespace ?? (await chooseNamespace(context, location.target));
    if (!namespace) {
      return;
    }
    const picked = await vscode.window.showQuickPick(
      SCHEMA_EXPORT_FORMATS.map((format) => ({ label: format.label(), description: `.${format.extension}`, id: format.id })),
      { placeHolder: l10n.t('Export {0} as', namespace) },
    );
    if (picked) {
      await saveSchemaExport(await context.schemas.get(location.target.id, namespace), picked.id);
    }
  } catch (error) {
    showError(error);
  }
}

async function chooseNamespace(context: DataDockContext, target: ConnectionTarget): Promise<string | undefined> {
  const adapter = await context.connections.getAdapter(target.id);
  const namespaces = await adapter.listNamespaces();
  if (namespaces.length <= 1) {
    return namespaces[0];
  }
  const fallback = chooseDefaultNamespace(target.kind, target.database, namespaces);
  const ordered = [...namespaces].sort((left, right) => Number(right === fallback) - Number(left === fallback));
  return vscode.window.showQuickPick(ordered, { placeHolder: l10n.t('Choose the schema') });
}
