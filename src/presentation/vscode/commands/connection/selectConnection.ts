import * as vscode from 'vscode';
import type { DataDockContext } from '../model/DataDockContext';
import { pickConnection } from '../registry/pickConnection';
import { SQL_LANGUAGE_ID } from '../../constants/sqlLanguageId';

export async function selectConnection(context: DataDockContext): Promise<void> {
  const picked = await pickConnection(context);
  const document = vscode.window.activeTextEditor?.document;
  if (picked && document?.languageId === SQL_LANGUAGE_ID) {
    context.bindings.bind(document.uri.toString(), picked.key);
  }
}
