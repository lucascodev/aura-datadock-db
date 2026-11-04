import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { findDocumentConnection } from './findDocumentConnection';
import { pickDocumentConnection } from './pickDocumentConnection';

export async function resolveDocumentConnection(context: DataDockContext, document: vscode.TextDocument): Promise<ConnectionTarget | undefined> {
  const uri = document.uri.toString();
  const boundKey = context.bindings.get(uri);
  const target = findDocumentConnection(context, document);

  if (boundKey && !target) {
    vscode.window.showWarningMessage(l10n.t('The database of this file is not available. Choose another one.'));
    return pickDocumentConnection(context, document);
  }
  if (!target) {
    return pickDocumentConnection(context, document);
  }
  context.bindings.bind(uri, target.key);
  return target;
}
