import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';
import { pickConnection } from './pickConnection';

export async function pickDocumentConnection(context: DataDockContext, document: vscode.TextDocument): Promise<ConnectionTarget | undefined> {
  const picked = await pickConnection(context);
  if (picked) {
    context.bindings.bind(document.uri.toString(), picked.key);
  }
  return picked;
}
