import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';

export function findDocumentConnection(context: DataDockContext, document: vscode.TextDocument): ConnectionTarget | undefined {
  const boundKey = context.bindings.get(document.uri.toString());
  return boundKey ? context.connections.findByKey(boundKey) : context.connections.activeTarget;
}
